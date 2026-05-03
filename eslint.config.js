/* --------------------
 * yauzl-promise module
 * ESLint config
 * ------------------*/

// Modules
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { importX as importPlugin } from "eslint-plugin-import-x";
import jestPlugin from "eslint-plugin-jest";
import nodePlugin from "eslint-plugin-n";
import { defineConfig } from "eslint/config";

// Exports

const config = defineConfig([
	js.configs.recommended,

	importPlugin.flatConfigs.recommended,

	{
		files: ["src/**/*.ts"],

		extends: [
			...tseslint.configs.recommended,
			importPlugin.flatConfigs.typescript,
		],

		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: process.cwd(),
			},
		},

		plugins: {
			import: importPlugin,
		},

		settings: {
			"import/resolver": {
				typescript: {
					project: "./tsconfig.json",
				},
			},
		},

		rules: {
			"import/no-unresolved": "error",
			"@typescript-eslint/no-unused-vars": "warn",
		},
	},
	{
		files: ["test/**/*.js"],
		plugins: {
			jest: jestPlugin,
		},
		languageOptions: {
			globals: jestPlugin.environments.globals.globals,
		},
		extends: [jestPlugin.configs["flat/recommended"]],
		rules: {
			"import-x/no-unresolved": [
				"error",
				{ ignore: ["^yauzl-promise$"], commonjs: true },
			],
		},
	},
	{
		files: ["**/*.js", "**/*.mjs"],
		extends: [nodePlugin.configs["flat/recommended-module"]],
		// These rules are redundant to the import-x ones, so they are disabled
		rules: {
			"n/no-missing-import": ["off"],
			"n/no-missing-require": ["off"],
			"n/no-unpublished-import": ["off"],
			"n/no-unpublished-require": ["off"],
			"n/no-extraneous-import": ["off"],
			"n/no-extraneous-require": ["off"],
		},
	},
	{
		files: ["**/*.cjs"],
		extends: [nodePlugin.configs["flat/recommended-script"]],
		// These rules are redundant to the import-x ones, so they are disabled
		rules: {
			"n/no-missing-import": ["off"],
			"n/no-missing-require": ["off"],
			"n/no-unpublished-import": ["off"],
			"n/no-unpublished-require": ["off"],
			"n/no-extraneous-import": ["off"],
			"n/no-extraneous-require": ["off"],
		},
	},
]);

export default defineConfig([
	{ ignores: ["dist/**/*", "test/fixtures/**/*"], extends: [config] },
]);
