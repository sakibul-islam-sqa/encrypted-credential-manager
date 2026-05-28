// @ts-check
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "**/*.d.ts",
      "eslint.config.js",
      // Safety net: tsc -b should never emit into src/, but if a misconfigured
      // run leaks .js/.js.map artifacts they shouldn't break lint.
      "src/**/*.js",
      "src/**/*.js.map",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The React Compiler lint rules in eslint-plugin-react-hooks v7 assume
      // the codebase opts into the Compiler. We don't, so disable them until
      // we adopt it.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          // Co-located `use*` hooks alongside their provider component are a
          // perfectly fine pattern in this codebase. They don't break HMR in
          // practice (the provider re-mounts and the hook reference stays
          // stable through the context value).
          allowExportNames: ["useAuth", "useToast", "useTheme", "SESSION_TTL_MS"],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  }
);
