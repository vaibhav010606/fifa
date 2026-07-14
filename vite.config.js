import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
    test: {
        // Exclude Playwright E2E spec files from Vitest — run those with `npx playwright test`
        exclude: ['**/node_modules/**', '**/*.spec.js'],
        environment: 'node',
    },
});
