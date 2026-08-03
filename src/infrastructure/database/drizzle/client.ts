/**
 * Drizzle OLTP client factory (ADR-042).
 *
 * Lives in infrastructure only. Domain repositories are interfaces; Drizzle
 * implements them here (or under module infrastructure) — domain never imports this.
 *
 * Factory-only: does not connect at module import time.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../schema/index.js";
import { CONNECTION } from "../../../postgresql-architecture/index.js";

export type DrizzleDb = ReturnType<typeof createDb>;

export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 10,
  });
  return drizzle(client, { schema });
}

/**
 * Build a DB client from process env. Requires DATABASE_URL (ADR-041 / ADR-042).
 */
export function createDbFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DrizzleDb {
  const url = env[CONNECTION.envVar];
  if (!url) {
    throw new Error(
      `${CONNECTION.envVar} is required for the Drizzle OLTP client (ADR-042).`,
    );
  }
  return createDb(url);
}
