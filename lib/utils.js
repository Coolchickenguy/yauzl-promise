/* --------------------
 * yauzl-promise module
 * Utility functions
 * ------------------*/

// Modules
import {Writable as WritableStream} from 'stream';
import {pipeline} from 'stream/promises';
import assert from 'simple-invariant';

// Exports

/**
 * Decode string from buffer, in either CP437 or UTF8 encoding.
 * @param {Buffer} buffer - Buffer
 * @param {number} start - Start position in buffer
 * @param {number} end - End position in buffer
 * @param {boolean} isUtf8 - `true` if UTF8 encoded
 * @returns {string} - Decoded string
 */
export function decodeBuffer(buffer, start, end, isUtf8) {
	if (isUtf8) return buffer.toString('utf8', start, end);

	let str = '';
	for (let i = start; i < end; i++) {
		str += CP437_CHARS[buffer[i]]; // eslint-disable-line no-use-before-define
	}
	return str;
}

const CP437_CHARS = '\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

/**
 * Validate filename.
 * @param {string} filename - Filename
 * @returns {undefined}
 * @throws {Error} - If invalid
 */
export function validateFilename(filename) {
	assert(filename.indexOf('\\') === -1, `Invalid characters in filename: ${filename}`);
	assert(
		// eslint-disable-next-line no-use-before-define
		!ABSOLUTE_FILENAME_REGEX1.test(filename) && !ABSOLUTE_FILENAME_REGEX2.test(filename),
		`Absolute path: ${filename}`
	);
	assert(filename.split('/').indexOf('..') === -1, `Relative path: ${filename}`);
}

const ABSOLUTE_FILENAME_REGEX1 = /^[a-zA-Z]:/,
	ABSOLUTE_FILENAME_REGEX2 = /^\//;

/**
 * Convert date + time timestamps to `Date` object.
 * DOS date format does not contain any notion of timezone, so interpret as UTC.
 * @param {number} date - Date integer
 * @param {number} time - Time integer
 * @returns {Date} - Date
 */
export function dosDateTimeToDate(date, time) {
	/* eslint-disable no-bitwise */
	const day = date & 0x1f; // 1-31
	const month = ((date >> 5) & 0xf) - 1; // 1-12, 0-11
	const year = ((date >> 9) & 0x7f) + 1980; // 0-128, 1980-2108

	const millisecond = 0;
	const second = (time & 0x1f) * 2; // 0-29, 0-58 (even numbers)
	const minute = (time >> 5) & 0x3f; // 0-59
	const hour = (time >> 11) & 0x1f; // 0-23
	/* eslint-enable no-bitwise */

	return new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
}

/**
 * Read Uint64 from buffer.
 * There is no native JS function for this, because we can't actually store 64-bit integers precisely.
 * After 53 bits, JavaScript's Number type (IEEE 754 double) can't store individual integers anymore.
 * But 53 bits is enough for our purposes in this context.
 * @param {Buffer} buffer - Buffer
 * @param {number} offset - Offset
 * @returns {number} - 64-bit(ish) integer
 */
export function readUInt64LE(buffer, offset) {
	// Can't use bitshifting here, because only supports 32-bit integers in JS
	return buffer.readUInt32LE(offset + 4) * 0x100000000 + buffer.readUInt32LE(offset);
}

/**
 * Drain contents of a readable stream into a Buffer.
 * @param {Object} stream - Readable stream
 * @returns {Buffer} - Buffer
 */
export async function streamToBuffer(stream) {
	const chunks = [];
	const collectStream = new WritableStream({
		write(chunk, encoding, cb) {
			chunks.push(chunk);
			cb();
		}
	});
	await pipeline(stream, collectStream);
	return Buffer.concat(chunks);
}
