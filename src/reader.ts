/* --------------------
 * yauzl-promise module
 * Reader classes
 * ------------------*/

// Modules
import {
  open as __open, close as __close, read as __read, createReadStream as __createReadStream,
} from 'fs';
import { PassThrough as PassThroughStream, Readable as ReadableStream } from 'stream';
import { promisify } from 'util';
import { isPositiveIntegerOrZero } from 'is-it-type';
import assert from 'simple-invariant';

// Imports
import { streamToBuffer } from './utils.js';

const openAsync = promisify(__open);
const closeAsync = promisify(__close);

// Exports

/**
 * `Reader` class.
 * `FileReader`, `FdReader` and `BufferReader` subclass this.
 *
 * Users can create custom `Reader`s by subclassing and implementing the following methods:
 *   - `_createReadStream(start, length)` (required)
 *   - `_read(start, length)` (optional)
 *   - `_open()` (optional)
 *   - `_close()` (optional)
 */
export abstract class Reader {
  isOpen: boolean;

  readCount: number;

  constructor() {
    this.isOpen = false;
    this.readCount = 0;
  }

  /**
	 * Open reader.
	 * Calls `._open()` method defined by subclass.
	 * If already open, does nothing.
	 * @async
	 * @returns
	 */
  async open() {
    if (this.isOpen) return;
    this.isOpen = true;
    await this._open();
  }

  /**
	 * Close reader.
	 * Calls `._close()` method defined by subclass.
	 * If already closed, does nothing.
	 * @async
	 * @returns
	 * @throws - If Reader is currently being read from
	 */
  async close() {
    if (!this.isOpen) return;
    assert(this.readCount === 0, 'Cannot close while reading in progress');
    this.isOpen = false;
    await this._close();
  }

  /**
	 * Read bytes into Buffer.
	 * @async
	 * @param start - Starting position to read at
	 * @param length - Number of bytes to read
	 * @returns - Buffer
	 * @throws - If Reader is not open
	 */
  async read(start: number, length: number): Promise<Buffer> {
    // Don't validate `start` + `length` because this is called so often
    assert(this.isOpen, 'Cannot call `read()` on a reader which is not open');

    if (length === 0) return Buffer.allocUnsafe(0);

    this.readCount++;
    try {
      return await this._read(start, length);
    } finally {
      this.readCount--;
    }
  }

  /**
	 * Create readable stream to read from Reader.
	 * @param start - Position to start reading at
	 * @param length - Number of bytes to read
	 * @returns - Readable stream
	 * @throws - If arguments invalid or reader is not open
	 */
  createReadStream(start: number, length: number): ReadableStream {
    // Validate input
    assert(isPositiveIntegerOrZero(start), '`start` must be a positive integer or zero');
    assert(isPositiveIntegerOrZero(length), '`length` must be a positive integer or zero');

    // Error if not open
    assert(this.isOpen, 'Cannot call `createReadStream()` on a reader which is not open');

    // Return empty stream for zero-size request
    if (length === 0) {
      const emptyStream = new PassThroughStream();
      setImmediate(() => emptyStream.end());
      return emptyStream;
    }

    // Get stream
    this.readCount++;
    try {
      const stream = this._createReadStream(start, length);

      // Mark stream as ended on an `end`, `error` or  `close` event.
      // In Node v16, these events don't reliably fire if stream is destroyed with `.destroy()`
      // so capture that too.
      let isEnded = false;
      const onEnd = () => {
        if (isEnded) return;
        isEnded = true;
        this.readCount--;
      };

      const originalDestroy = stream.destroy;
      stream.destroy = function (err) {
        onEnd();
        return originalDestroy.call(this, err);
      };

      stream.on('end', onEnd);
      stream.on('error', onEnd);
      stream.on('close', onEnd);

      return stream;
    } catch (err) {
      this.readCount--;
      throw err;
    }
  }

  /**
	 * Open Reader.
	 * Default implementation does nothing. Subclasses can optionally implement this.
	 * @async
	 * @returns
	 */
  async _open() {}

  /**
	 * Close Reader.
	 * Default implementation does nothing. Subclasses can optionally implement this.
	 * @async
	 * @returns
	 */
  async _close() {}

  /**
	 * Read bytes from Reader into a Buffer.
	 * Subclasses can override this.
	 * @async
	 * @param start - Starting position to read at
	 * @param length - Number of bytes to read
	 * @returns - Buffer
	 */
  async _read(start: number, length: number): Promise<Buffer<ArrayBufferLike>> {
    const stream = this._createReadStream(start, length);
    const buffer = await streamToBuffer(stream);
    assert(buffer.length === length, 'Unexpected end of file');
    return buffer;
  }

	/**
	 * Create readable stream to read from Reader.
	 * Subclasses must implement this.
	 * @param start - Position to start reading at
	 * @param length - Number of bytes to read
	 * @returns - Readable stream
	 * @throws - If fail to create stream
	 */
	abstract _createReadStream(start: number, length: number): ReadableStream;
}

// Shim of `fs` module to prevent file descriptor being closed if stream is destroyed
const shimmedFs = {
  open() {
    throw new Error(
      'Shimmed FS `open` method should not be called. If you get this error, please raise an issue.',
    );
  },
  read(...args: Parameters<typeof __read>) {
    return __read(...args);
  },
  close(fd: unknown, cb: (...args: unknown[]) => void) {
    setImmediate(() => cb(null));
  },
};

export class FilesystemReader extends Reader {
  fd: number | null = null;

  /**
	 * Create a filesystem reader.
	 * This class does not automatically assign the file descriptor.
	 */
  constructor() {
    super();
  }

  _read(start: number, length: number) {
    return new Promise<Buffer>((resolve, reject) => {
      const buffer: Buffer = Buffer.allocUnsafe(length);
      assert(this.fd, 'Missing file descriptor');
      __read(this.fd, buffer as unknown as Uint8Array, 0, length, start, (err, bytesRead) => {
        if (err) {
          reject(err);
        } else if (bytesRead !== length) {
          reject(new Error('Unexpected end of file'));
        } else {
          resolve(buffer);
        }
      });
    });
  }

  _createReadStream(start: number, length: number) {
    assert(this.fd, 'Missing file descriptor');
    // Use shimmed `fs` with inactive `close()` method,
    // to prevent file descriptor getting closed when stream ends.
    // `autoClose` option works for this purpose when stream ends naturally,
    // but FD still gets closed if `.destroy()` is called.
    // Shimming FS is only way I around this that I could find.
    // Typescript does not have the correct typings for the first parameter, and the FS parameter is not known
    return __createReadStream(null as unknown as string, {
      start, end: start + length - 1, fd: this.fd, ...({ fs: shimmedFs }),
    });
  }
}

export class FdReader extends FilesystemReader {
  fd: number;

  /**
	 * Create `FdReader`.
	 * @param fd - File descriptor
	 */
  constructor(fd: number) {
    super();
    this.fd = fd;
  }

  _close() {
    return closeAsync(this.fd);
  }
}

export class FileReader extends FilesystemReader {
  path: string;

  fd: null | number;

  /**
	 * Create `FileReader`.
	 * @param path - File path
	 */
  constructor(path: string) {
    super();
    this.path = path;
    this.fd = null;
  }

  async _open() {
    this.fd = await openAsync(this.path, 'r', 0o444);
  }

  async _close() {
    if(this.fd) {await closeAsync(this.fd)}
    this.fd = null;
  }
}

export class BufferReader extends Reader {
  buffer: Buffer;

  /**
	 * Create `BufferReader`.
	 * @param buffer - Buffer
	 */
  constructor(buffer: Buffer) {
    super();
    this.buffer = buffer;
  }

  async _read(start: number, length: number) {
    const end = start + length;
    assert(end <= this.buffer.length, 'Cannot read beyond end of buffer');
    return this.buffer.subarray(start, end);
  }

  _createReadStream(start: number, length: number) {
    const end = start + length;
    assert(end <= this.buffer.length, 'Cannot read beyond end of buffer');
    const slice = this.buffer.subarray(start, end);
    return ReadableStream.from(slice);
  }
}
