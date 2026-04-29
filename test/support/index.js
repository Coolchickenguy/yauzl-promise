/* --------------------
 * yauzl-promise
 * Tests set-up
 * ------------------*/

/*
 * Throw any unhandled promise rejections
 */
process.on('unhandledRejection', (err) => {
	throw err;
});
