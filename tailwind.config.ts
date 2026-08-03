/**
 * ADR-020 — thin compatibility stub for shadcn `components.json`.
 * Theme tokens live in `app/globals.css` (`:root` + `@theme`).
 */
import type { Config } from "tailwindcss";

const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./middleware.ts",
  ],
} satisfies Config;

export default config;
