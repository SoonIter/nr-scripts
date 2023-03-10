module.exports = {
	root: true,
	extends: ['moon', 'moon/node'],
	parserOptions: {
		project: 'tsconfig.eslint.json',
		tsconfigRootDir: __dirname,
	},
	overrides: [
		{
			files: ['**/*'],
			rules: {
				'sort-keys': 'off',
				'no-unsafe-assignment': 'off',
				'max-classes-per-file': 'off',
			},
		},
		{
			files: ['scripts/**/*'],
			rules: {
				'no-console': 'off',
				'no-magic-numbers': 'off',
				'promise/prefer-await-to-callbacks': 'off',
			},
		},
		{
			files: ['website/**/*'],
			rules: {
				// Path aliases
				'import/no-unresolved': 'off',
			},
		},
	],
};
