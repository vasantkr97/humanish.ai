import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "build/**"],
  },
  {
    rules: {
      // Allow 'any' types temporarily - will fix gradually
      "@typescript-eslint/no-explicit-any": "warn",

      // Make unused vars a warning instead of error
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Allow unnecessary escapes (common in regex)
      "no-useless-escape": "warn",

      // Allow case declarations
      "no-case-declarations": "warn",

      // Allow const reassignment in some cases
      "prefer-const": "warn",

      // Allow require() imports
      "@typescript-eslint/no-require-imports": "warn",

      // Allow wrapper object types
      "@typescript-eslint/no-wrapper-object-types": "warn",
    },
  }
);
