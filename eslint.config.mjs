import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const restrictedTauriImports = [
  {
    group: ["@tauri-apps/**", "@crabnebula/**"],
    message:
      "Tauri solo se toca desde src/shared/ipc/. Usa los envoltorios tipados de src/shared/ipc.",
  },
];

const bannedModules = [
  {
    group: ["framer-motion"],
    message: "Usa motion/react, que es la librería de animación del proyecto.",
  },
  {
    group: ["next/server", "next/headers"],
    message: "El export estático no admite APIs de servidor de Next.js.",
  },
];

export default tseslint.config(
  {
    ignores: [
      "out/**",
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "src-tauri/**",
      "e2e/test-results/**",
      "e2e/playwright-report/**",
      ".verify/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-undef": "off",
      "no-console": ["error", { allow: ["warn", "error", "debug", "info"] }],
      "no-restricted-imports": [
        "error",
        { patterns: [...restrictedTauriImports, ...bannedModules] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: 'ExpressionStatement > Literal[value="use server"]',
          message: "El export estático no admite Server Actions.",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description", "ts-ignore": true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    files: ["src/shared/ipc/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: bannedModules }] },
  },
  {
    files: ["src/shared/log/**/*.ts"],
    rules: { "no-console": "off" },
  },
  {
    files: [
      "eslint.config.mjs",
      "postcss.config.mjs",
      "next.config.ts",
      "vitest.config.mts",
      "scripts/**/*.{mjs,js,ts}",
      "e2e/**/*.ts",
    ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "no-console": "off" },
  },
);
