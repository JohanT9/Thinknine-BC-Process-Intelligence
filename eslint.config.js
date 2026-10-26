"use strict";

const js = require("@eslint/js");
const globals = require("globals");

// Extension pages and the service worker load classic scripts that share one
// global scope and reach each other through globalThis.T9* namespaces. The
// UMD wrappers also reference module/require when the same file runs in Node
// tests, so those names are defined for authored source as well.
const extensionGlobals = {
  ...globals.browser,
  ...globals.serviceworker,
  ...globals.webextensions,
  module: "readonly",
  require: "readonly"
};

module.exports = [
  {
    ignores: ["dist/**", "release/**", "output/**", "tmp/**", "node_modules/**",
      "services/**/node_modules/**", "tests/tools/**", "docs/**"]
  },
  js.configs.recommended,
  {
    rules: {
      // Diagnostics and file names are sanitized by removing control characters.
      "no-control-regex": "off",
      // Optional evidence (version, clipboard, storage) deliberately ignores failures.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Rest destructuring deliberately drops fields; "_" marks intentionally unused names.
      "no-unused-vars": ["error", { caughtErrors: "none", ignoreRestSiblings: true,
        argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  },
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "script", globals: extensionGlobals }
  },
  {
    files: ["src/**/*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: globals.browser }
  },
  {
    files: ["tests/**/*.js", "scripts/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "commonjs", globals: globals.node }
  },
  {
    files: ["tests/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: globals.node }
  }
];
