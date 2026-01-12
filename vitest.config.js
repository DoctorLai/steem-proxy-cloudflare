import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8', // or 'istanbul'
            reporter: ['text', 'html', 'json', 'json-summary'],
            reportsDirectory: './coverage',
            thresholds: {
                lines: 96.55,
                statements: 96.55,
                functions: 100,
                branches: 89.13,
            }, 
        },
    },
});