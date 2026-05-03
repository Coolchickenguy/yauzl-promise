import Zip from './zip.js';

export interface ExtraField {
    id: number;
    data: Buffer
}

export type EntryFilename = Buffer | string;

export interface EntryOptions {
	filename: EntryFilename;
	compressedSize: number;
	uncompressedSize: number;
	compressionMethod: number;
	fileHeaderOffset: number;
	fileDataOffset: null | unknown;
	isZip64: boolean;
	crc32: number;
	lastModTime: number
	lastModDate: number;
	comment: string | Buffer
	extraFields: ExtraField[];
	versionMadeBy: number
	versionNeededToExtract: number;
	generalPurposeBitFlag: number;
	internalFileAttributes: number;
	externalFileAttributes: number;
	zip: Zip;
}

export type ZipOptions = {
	/**
	 * Decode filenames and comments to strings
	 */
	decodeStrings?: boolean;
	/**
	 * Validate entry sizes
	 */
	validateEntrySizes?: boolean;
	/**
	 * Validate filenames
	 */
	validateFilenames?: boolean;
	/**
	 * Don't allow backslashes (`\`) in filenames
	 */
	strictFilenames?: boolean;
};

export interface ReadStreamOptions {
	/**
	 * `false` to output raw data without decompression
	 */
	decompress?: boolean;
	/**
	 * `false` to disable decryption if is encrypted
	 */
	decrypt?: boolean;
	/**
	 * `false` to skip CRC32 validation
	 */
	validateCrc32?: boolean;
	/**
	 * Start offset (only valid if not decompressing)
	 */
	start?: number;
	/**
	 * End offset (only valid if not decompressing)
	 */
	end?: number;
}
