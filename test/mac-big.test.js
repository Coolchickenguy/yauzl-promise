/* --------------------
 * yauzl-promise module
 * Tests
 * ------------------*/

// Init
import './support/index.js'; // 5 minutes

// Modules
import {join as pathJoin} from 'node:path';
import assert from 'simple-invariant';
import {open} from 'yauzl-promise';

// Imports
import {streamToString, testsRoot} from './support/utils.js';

jest.setTimeout(5 * 60000);

// Tests

// NB: No tests for ZIP files >= 4 GiB as would require 4 GiB files as fixtures.
// Have tested on a large collection of Mac OS Archive Utility ZIP files ranging from 4 GiB to 100 GiB.

const FIXTURES_DIR = pathJoin(testsRoot, 'fixtures/mac');

// Set `MAC_BIG_SIZE` env var to only run test for a certain entry count
let SIZES = [65534, 65535, 65536, 65537, 131072, 200000];
if (process.env.MAC_BIG_SIZE) {
	const size = process.env.MAC_BIG_SIZE * 1;
	assert(SIZES.includes(size), `Invalid MAC_BIG_SIZE size: ${process.env.MAC_BIG_SIZE}`);
	SIZES = [size];
}

let zip;
afterEach(async () => {
	if (zip) await zip.close();
});

describe('handles large number of files', () => {
	it.each(SIZES.map(size => [size]))('%s files', async (entryCount) => {
		const zipPath = pathJoin(FIXTURES_DIR, `${entryCount}-files.zip`);

		const received = [true];
		for (let i = 1; i <= entryCount; i++) {
			received[i] = false;
		}

		let fileCount = 0;
		zip = await open(zipPath);
		for await (const entry of zip) {
			fileCount++;

			const match = entry.filename.match(/^(\d+)\.txt$/);
			expect(match).toBeDefined();
			const num = match[1] * 1;
			expect(received[num]).toBeFalse();
			received[num] = true;

			const stream = await entry.openReadStream();
			const content = await streamToString(stream);
			expect(content).toBe(`${num}\n`);
		}
		expect(fileCount).toBe(entryCount);

		expect(zip.isMacArchive).toBe(entryCount >= 65535);
		expect(zip.isMaybeMacArchive).toBe(entryCount < 65535);
	});
});
