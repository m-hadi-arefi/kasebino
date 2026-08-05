import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".next/**",
      "public/**",
      "next.config.ts",
      "next-env.d.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/auth.ts",
      "src/auth.config.ts",
      "src/types/next-auth.d.ts",
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.contracts.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "middleware.ts",
      "src/auth.ts",
      "src/auth.config.ts",
      "src/types/next-auth.d.ts",
      "src/components/**/*.tsx",
      "src/lib/**/*.ts",
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
);
