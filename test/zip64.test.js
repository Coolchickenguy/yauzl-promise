/* --------------------
 * yauzl-promise module
 * Tests
 * ------------------*/

// Init
import './support/index.js';

// Modules
import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';
import { Readable as ReadableStream, Writable as WritableStream } from 'stream';
import BufferList from 'bl';
import assert from 'simple-invariant';
import { fromReader, Reader } from 'yauzl-promise';

// Imports
import { streamToString, testsDirectory } from './support/utils.js';

// Tests

// This test copied from `yauzl` repo with only changes to convert to promise-style code.
// How `zip64.zip_fragment` was created is unclear, but test appears to create an illusion of
// a huge ZIP64 ZIP file containing 2 x small files and 1 x large binary file.
// The test checks that:
// 1. `yauzl` parses the file correctly.
// 2. Content of the 2 x small files are unzipped successfully by `openReadStream()`.
// 3. Start of the content of the large binary file is correct (it doesn't test the entire file).

const FRAGMENT_PATH = pathJoin(testsDirectory, 'fixtures/zip64/zip64.zip_fragment');
const LARGE_BIN_LENGTH = 8000000000;

it('handles large ZIP64 file', async () => {
  const { reader, size } = makeRandomAccessReader();

  const zip = await fromReader(reader, size);

  try {
    const entries = await zip.readEntries();

    expect(entries.map((entry) => entry.filename)).toEqual(['a.txt', 'large.bin', 'b.txt']);

    const textStream1 = await entries[0].openReadStream();
    const content1 = await streamToString(textStream1);
    expect(content1).toBe('hello a\n');

    const expectedBinStart = await getPrefixOfStream(newLargeBinContentsProducer());
    const bigBinaryStream = await entries[1].openReadStream();
    const actualBinStart = await getPrefixOfStream(bigBinaryStream);
    expect(actualBinStart).toEqual(expectedBinStart);

    const textStream2 = await entries[2].openReadStream();
    const content2 = await streamToString(textStream2);
    expect(content2).toBe('hello b\n');
  } finally {
    await zip.close();
  }
});

// This is just some bytes so we can identify it
const PREFIX_LENGTH = 0x100;
function getPrefixOfStream(stream) {
  return new Promise((resolve) => {
    const prefixBuffer = Buffer.alloc(PREFIX_LENGTH);
    const writer = new WritableStream();
    writer._write = function (chunk, encoding, callback) { // eslint-disable-line no-unused-vars
      chunk.copy(prefixBuffer, 0, 0, PREFIX_LENGTH);
      stream.unpipe(writer);
      stream.destroy();
      resolve(prefixBuffer);
    };
    stream.pipe(writer);
  });
}

function makeRandomAccessReader() {
  const backendContents = readFileSync(FRAGMENT_PATH);

  assert(backendContents.length > 4, 'Unexpected EOF');
  const largeBinContentsOffset = backendContents.readUInt32BE(0) - 4;
  assert(largeBinContentsOffset <= backendContents.length, '.zip_fragment header is malformed');
  const largeBinContentsEnd = largeBinContentsOffset + LARGE_BIN_LENGTH;

  let firstRead = true;
  const pretendSize = backendContents.length + LARGE_BIN_LENGTH - 4;

  class InflatingReader extends Reader {
    _createReadStream(start, length) {
      const thisIsTheFirstRead = firstRead;
      const end = start + length;
      firstRead = false;
      const result = new BufferList();
      if (end <= largeBinContentsOffset) {
        result.append(backendContents.subarray(start + 4, end + 4));
      } else if (start >= largeBinContentsOffset + LARGE_BIN_LENGTH) {
        result.append(backendContents.subarray(start - LARGE_BIN_LENGTH + 4, end - LARGE_BIN_LENGTH + 4));
      } else if (start === largeBinContentsOffset && end === largeBinContentsEnd) {
        return newLargeBinContentsProducer();
      } else if (thisIsTheFirstRead && start > largeBinContentsOffset && end === pretendSize) {
        // yauzl's first move is to cast a large net to try to find the EOCDR.
        // yauzl's only going to care about the end of this data, so fill in the gaps with dummy data.
        const dummyTrash = Buffer.alloc(largeBinContentsEnd - start);
        result.append(dummyTrash);
        result.append(backendContents.subarray(largeBinContentsOffset + 4));
      } else {
        throw new Error(
          `_createReadStream(${start}, ${length}) misaligned to range `
					+ `[${largeBinContentsOffset}, ${largeBinContentsEnd - largeBinContentsOffset}]`,
        );
      }
      return result;
    }
  }

  const reader = new InflatingReader();
  return { reader, size: pretendSize };
}

function newLargeBinContentsProducer() {
  // Emits the fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13, ...
  // with each entry encoded in a UInt32BE.
  // Arithmetic overflow will happen eventually, resulting in wrap around.
  // As a consequence of limited precision, this sequence repeats itself after 6442450944 entires.
  // However, we only require 2000000000 entries, so it's good enough.
  let prev0 = -1;
  let prev1 = 1;
  let byteCount = 0;
  return new ReadableStream({
    read(size) { // eslint-disable-line no-unused-vars
      while (true) {
        if (byteCount >= LARGE_BIN_LENGTH) {
          this.push(null);
          return;
        }
        const bufferSize = Math.min(0x10000, LARGE_BIN_LENGTH - byteCount);
        const buffer = Buffer.alloc(bufferSize);
        for (let i = 0; i < bufferSize; i += 4) {
          const n = ((prev0 + prev1) & 0xffffffff) >>> 0;
          prev0 = prev1;
          prev1 = n;
          byteCount += 4;
          buffer.writeUInt32BE(n, i, true);
        }
        if (!this.push(buffer)) return;
      }
    },
  });
}
