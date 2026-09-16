import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import oxlint from 'eslint-plugin-oxlint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    ...typescript.configs.recommended,
    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        ...importPlugin.flatConfigs.recommended,
        settings: {
            'import/resolver': {
                typescript: true,
                node: true,
            },
        },
        rules: {
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
        },
    },
    {
        ...importPlugin.flatConfigs.typescript,
        files: ['**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                },
            ],
        },
    },
    {
        files: ['resources/js/wayfinder/**/*.ts'],
        rules: {
            'import/order': 'off',
        },
    },
    {
        // Rules oxlint doesn't cover: cognitive complexity/code smells, Node
        // security footguns, and DOM XSS sinks (dangerouslySetInnerHTML, etc.).
        ...sonarjs.configs.recommended,
        files: ['resources/js/**/*.{ts,tsx}'],
        ignores: ['resources/js/wayfinder/**'],
    },
    {
        ...security.configs.recommended,
        files: ['resources/js/**/*.{ts,tsx}'],
        ignores: ['resources/js/wayfinder/**'],
        rules: {
            ...security.configs.recommended.rules,
            // Flags ordinary array/object indexing everywhere; not useful for this frontend.
            'security/detect-object-injection': 'off',
        },
    },
    {
        ...noUnsanitized.configs.recommended,
        files: ['resources/js/**/*.{ts,tsx}'],
        ignores: ['resources/js/wayfinder/**'],
    },
    {
        ignores: [
            'vendor',
            'node_modules',
            'public',
            'bootstrap/ssr',
            'tailwind.config.js',
            'vite.config.ts',
        ],
    },
    prettier, // Turn off all rules that might conflict with Prettier
    ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'), // Disable ESLint rules oxlint already covers; keep this last
];
