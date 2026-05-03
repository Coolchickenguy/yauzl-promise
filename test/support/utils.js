/* --------------------
 * yauzl-promise
 * Tests utils
 * ------------------*/

// Modules
import { join as pathJoin, dirname as pathDirname } from 'path';
import { readdirSync, readFileSync } from 'fs';

// Imports
import { fileURLToPath } from 'url';
import { streamToBuffer } from '../../dist/utils.js';

// Exports

export { streamToBuffer } from '../../dist/utils.js';

export const testsDirectory = pathDirname(pathDirname(fileURLToPath(import.meta.url)));

/**
 * Drain contents of a readable stream into a string.
 * @param {Object} stream - Readable stream
 * @returns {string} - String
 */
export async function streamToString(stream) {
  const buffer = await streamToBuffer(stream);
  return buffer.toString();
}

/**
 * Get list of files in a directory.
 * @param {string} dirPath - Path to directory
 * @returns {Array<string>} - Array of file paths
 */
export function getFiles(dirPath) {
  const files = Object.create(null);
  getFilesForDir(dirPath, '', files);
  return files;
}

export function getFilesForDir(fullPath, dirPath, files) {
  const dirents = readdirSync(fullPath, { withFileTypes: true });
  for (const dirent of dirents) {
    const filename = dirPath ? `${dirPath}/${dirent.name}` : dirent.name;

    if (dirent.isDirectory()) {
      files[`${filename}/`] = null;
      getFilesForDir(pathJoin(fullPath, dirent.name), filename, files);
    } else if (dirent.name === '.dont_expect_an_empty_dir_entry_for_this_dir') {
      delete files[filename.slice(0, -'.dont_expect_an_empty_dir_entry_for_this_dir'.length)];
    } else if (!['.DS_Store', '.git_please_make_this_directory'].includes(dirent.name)) {
      files[filename] = readFileSync(pathJoin(fullPath, dirent.name));
    }
  }
}
