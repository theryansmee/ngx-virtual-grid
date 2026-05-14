// @ts-check
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
	{
		files: ['**/*.ts'],
		extends: [
			...tseslint.configs.recommended,
			...angular.configs.tsRecommended,
		],
		rules: {
			'indent': [
				'error',
				'tab',
				{
					'SwitchCase': 1,
				},
			],
			'comma-dangle': [
				'error',
				'always-multiline',
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/typedef': [
				'error',
				{
					'memberVariableDeclaration': true,
					'parameter': true,
					'propertyDeclaration': true,
				},
			],
			'@typescript-eslint/explicit-member-accessibility': [
				'error',
				{
					'accessibility': 'explicit',
					'overrides': {
						'constructors': 'no-public',
					},
				},
			],
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{
					'allowExpressions': true,
				},
			],
			'curly': [
				'error',
				'all',
			],
			'brace-style': [
				'error',
				'1tbs',
				{
					'allowSingleLine': false,
				},
			],
			'padding-line-between-statements': [
				'error',
				{
					'blankLine': 'always',
					'prev': 'if',
					'next': '*',
				},
			],
			'array-element-newline': [
				'error',
				{
					'multiline': true,
					'minItems': 2,
				},
			],
			'array-bracket-newline': [
				'error',
				{
					'multiline': true,
					'minItems': 2,
				},
			],
		},
	},
	{
		files: ['projects/ngx-virtual-grid/**/*.ts'],
		rules: {
			'@angular-eslint/directive-selector': [
				'error',
				{
					'type': 'attribute',
					'prefix': 'ngx',
					'style': 'camelCase',
				},
			],
			'@angular-eslint/component-selector': [
				'error',
				{
					'type': 'element',
					'prefix': 'ngx',
					'style': 'kebab-case',
				},
			],
		},
	},
	{
		files: ['projects/demo/**/*.ts'],
		rules: {
			'@angular-eslint/directive-selector': [
				'error',
				{
					'type': 'attribute',
					'prefix': 'app',
					'style': 'camelCase',
				},
			],
			'@angular-eslint/component-selector': [
				'error',
				{
					'type': 'element',
					'prefix': 'app',
					'style': 'kebab-case',
				},
			],
		},
	},
	{
		files: ['**/*.html'],
		extends: [
			...angular.configs.templateRecommended,
		],
		rules: {},
	},
);
