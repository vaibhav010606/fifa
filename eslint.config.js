// eslint.config.js — ESLint flat config (ESLint v9+)
import js from '@eslint/js';

export default [
    // Global ignores must be in their own config object with no other keys
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'mingit/**',
            'test-results/**',
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        rules: {
            // Catch likely bugs
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            'no-undef': 'error',

            // Prevent debug code shipping to production
            'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],

            // Code style
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'warn',
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Browser & HTML globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                sessionStorage: 'readonly',
                localStorage: 'readonly',
                EventSource: 'readonly',
                SpeechSynthesisUtterance: 'readonly',
                SpeechSynthesis: 'readonly',
                webkitSpeechRecognition: 'readonly',
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
                ResizeObserver: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                // Node & Fetch API globals for Edge runtime
                Response: 'readonly',
                ReadableStream: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                // Service worker globals
                self: 'readonly',
                caches: 'readonly',
            },
        },
    },
    // Relax rules for test files
    {
        files: ['tests/**/*.js'],
        rules: {
            'no-console': 'off',
            'no-unused-vars': 'off',
        },
    },
];
