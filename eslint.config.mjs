// ESLint flat config for MarkStudio (T-121).
//
// Encodes the rules in docs/CODING_GUIDELINES.md that a linter can enforce:
// strict TypeScript hygiene (no `any`, explicit exported types), no unused
// code, and `===` over `==`. tsc (strict) already does the heavy type
// checking, so ESLint here is about style/hygiene, not type soundness.
//
// Formatting is owned by Prettier (see .prettierrc.json); `eslint-config-prettier`
// is applied last to disable any stylistic rules that would conflict.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  // Build output, dependencies, and downloaded test runtimes are not linted.
  {
    ignores: ["dist/**", "dist-test/**", "node_modules/**", ".vscode-test/**"]
  },

  js.configs.recommended,

  // TypeScript source (extension host + webview).
  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      eqeqeq: ["error", "always"],
      // Intentional diagnostics are allowed; stray debug logging is not.
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Public/exported API carries explicit types (CODING_GUIDELINES §1).
      "@typescript-eslint/explicit-module-boundary-types": "error",
      // Allow leading-underscore params to mark intentionally-unused arguments.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  },

  // CommonJS Node scripts (esbuild build/test bundlers at the repo root).
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node }
    },
    rules: {
      // Build scripts log progress to the console by design.
      "no-console": "off"
    }
  },

  // Test harnesses and mocks are not a public API and print runner progress.
  {
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": "off"
    }
  },

  // Prettier compatibility — must stay last so it can switch off any
  // formatting-related rules from the configs above.
  prettier
);
