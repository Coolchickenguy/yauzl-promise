/* --------------------
 * yauzl-promise module
 * Entry point
 * ------------------*/

// Modules
import { fstat } from 'fs';
import { promisify } from 'util';
import {
  isObject, isString, isBoolean, isInteger, isPositiveInteger,
} from 'is-it-type';
import assert from 'simple-invariant';

// Imports
import Zip from './zip.js';
import {
  Reader, FileReader, FdReader, BufferReader,
} from './reader.js';
import { INTERNAL_SYMBOL } from './shared.js';
import { ZipOptions } from './types.js';

const fstatAsync = promisify(fstat);

// Exports

export { default as Zip } from './zip.js';
export { default as Entry } from './entry.js';
export { Reader } from './reader.js';
export { dosDateTimeToDate, validateFilename } from './utils.js';

/**
 * Create `Zip` from file.
 * @param path - ZIP file path
 * @param options - Options
 * @returns - `Zip` class instance
 */
export async function open(path: string, options: ZipOptions): Promise<Zip> {
  assert(isString(path), '`path` must be a string');
  options = validateOptions(options);

  const reader = new FileReader(path);
  await reader.open();
  assert(reader.fd, 'Missing file descriptor');
  const { size } = await fstatAsync(reader.fd);

  const zip = new Zip(INTERNAL_SYMBOL, reader, size, options);
  await zip._init();
  return zip;
}

/**
 * Create `Zip` from file descriptor.
 * @param fd - ZIP file descriptor
 * @param options - Options
 * @returns - `Zip` class instance
 */
export async function fromFd(fd: number, options: ZipOptions): Promise<Zip> {
  assert(isInteger(fd), '`fd` must be an integer');
  options = validateOptions(options);

  const reader = new FdReader(fd);
  await reader.open();
  const { size } = await fstatAsync(fd);

  const zip = new Zip(INTERNAL_SYMBOL, reader, size, options);
  await zip._init();
  return zip;
}

/**
 * Create `Zip` from `Buffer`.
 * @param buffer - Buffer containing ZIP file
 * @param options - Options
 * @returns `Zip` class instance
 */
export async function fromBuffer(buffer: Buffer, options: ZipOptions): Promise<Zip> {
  assert(buffer instanceof Buffer, '`buffer` must be a Buffer');
  options = validateOptions(options);

  const reader = new BufferReader(buffer);
  await reader.open();
  const zip = new Zip(INTERNAL_SYMBOL, reader, buffer.length, options);
  await zip._init();
  return zip;
}

/**
 * Create `Zip` from `Reader`.
 * @param reader - `Reader` object
 * @param size - Size of ZIP file
 * @param options - Options
 * @returns - `Zip` class instance
 */
export async function fromReader(reader: Reader, size: number, options: ZipOptions): Promise<Zip> {
  assert(reader instanceof Reader, '`reader` must be an instance of `Reader` class');
  assert(isPositiveInteger(size), '`size` must be a positive integer');
  options = validateOptions(options);

  await reader.open();
  const zip = new Zip(INTERNAL_SYMBOL, reader, size, options);
  await zip._init();
  return zip;
}

/**
 * Validate and conform `Zip` creation options.
 * @param inputOptions - Input options object
 * @returns - Conformed options object
 */
export function validateOptions(inputOptions: ZipOptions) {
  const options = {
    decodeStrings: true,
    validateEntrySizes: true,
    validateFilenames: true,
    strictFilenames: false,
  };

  if (inputOptions != null) {
    assert(isObject(inputOptions), '`options` must be an object if provided');

    for (const [key, value] of Object.entries(inputOptions)) {
      assert(key in options, `Unknown option '${key}'`);
      assert(isBoolean(value), `\`options.${key}\` must be a boolean if provided`);
      options[key as keyof typeof options] = value;
    }
  }

  return options;
}
