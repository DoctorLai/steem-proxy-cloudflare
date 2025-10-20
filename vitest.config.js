import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8', // or 'istanbul'
            reporter: ['text', 'html', 'json', 'json-summary'],
            reportsDirectory: './coverage',
            thresholds: {
                lines: 80,
                statements: 80,
            }, 
        },
    },
});