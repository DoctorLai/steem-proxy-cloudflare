// eslint.config.js
import js from "@eslint/js";
import pluginImport from "eslint-plugin-import";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  prettier,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
      },
    },
    plugins: {
      import: pluginImport,
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "import/no-unresolved": "off",
      ...pluginImport.configs.recommended.rules,
    },
  },
  // ✅ Separate config for test files
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Vitest globals
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        global: "readonly",

        // Cloudflare/Fetch API globals for tests
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
      },
    },
  },
];
