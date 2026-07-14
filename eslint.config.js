// eslint.config.js — ESLint flat config (ESLint v9+)
import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        files: ['**/*.js'],
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'mingit/**',
        ],
        rules: {
            // Catch likely bugs
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'error',

            // Prevent debug code shipping to production
            'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],

            // Code style — Prettier handles formatting; ESLint handles logic only
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'warn',
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                sessionStorage: 'readonly',
                localStorage: 'readonly',
                EventSource: 'readonly',
                SpeechSynthesisUtterance: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                AbortController: 'readonly',
                Buffer: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                console: 'readonly',
                process: 'readonly',
                // Three.js is loaded as ESM — no global
            },
        },
    },
    // Relax rules for test files — they intentionally test edge cases
    {
        files: ['tests/**/*.js'],
        rules: {
            'no-console': 'off',
        },
    },
];
