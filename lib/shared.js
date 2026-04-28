/* --------------------
 * yauzl-promise module
 * Shared objects
 * ------------------*/

/* global FinalizationRegistry */

// Exports

// Object used as private symbol to ensure `Zip` and `Entry` classes cannot be constructed by user
export const INTERNAL_SYMBOL = {};

// Finalization registry for entries with uncertain uncompressed size
export const uncertainUncompressedSizeEntriesRegistry = new FinalizationRegistry(
	({zip, ref}) => zip._uncertainUncompressedSizeEntryRefs?.delete(ref)
);
