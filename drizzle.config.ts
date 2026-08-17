import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config (ADR-042 / ADR-046).
 * Migrations: versioned SQL under `out` via `npm run db:generate`;
 * apply with `npm run db:migrate` as a job before traffic (never on boot in prod).
 * Contract: `src/infrastructure/database/contracts/migration-strategy`.
 */
export default defineConfig({
  schema: "./src/infrastructure/database/schema/index.ts",
  out: "./src/infrastructure/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
