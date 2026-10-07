import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config([
  globalIgnores(["dist", ".wrangler", "worker/worker-configuration.d.ts", "migrations/seed"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs["recommended-latest"], reactRefresh.configs.vite],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
      // Arquivos de feature exportam componentes + helpers pequenos de propósito.
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["worker/**/*.ts", "shared/**/*.ts", "test/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.worker },
  },
  {
    files: ["scripts/**/*.mjs", "*.config.{js,ts}"],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.node },
  },
]);
