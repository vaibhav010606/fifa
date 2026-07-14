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
        coverage: {
            provider: 'v8',
            // Thresholds are enforced so coverage cannot silently regress.
            //
            // Why these numbers:
            //   server.js has runtime-only branches (SSE broadcast loop, production
            //   static serving, app.listen) that cannot be hit by unit/integration
            //   tests without a live network env. Excluding it gives an honest read
            //   on the js/ modules that ARE fully testable.
            //
            //   js/ modules achieve 66%+ statement coverage — enforce that floor.
            //   Raise thresholds incrementally as coverage improves.
            exclude: [
                '**/node_modules/**',
                '**/*.spec.js',
                'server.js',       // runtime paths only
                'server/**',       // refactored server logic (tested via integration/e2e)
                'dist/**',
                'coverage/**',
            ],
            thresholds: {
                statements: 66,
                branches: 60,
                functions: 60,
                lines: 66,
            },
        },
    },
});
