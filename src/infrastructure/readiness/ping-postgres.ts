/**
 * Postgres OLTP ping for readiness (ADR-112).
 * Cheap `SELECT 1` — never replaces liveness `/api/health`.
 */

import postgres from "postgres";

import { CONNECTION } from "../../postgresql-architecture/index.js";

/**
 * Ping Postgres via DATABASE_URL. Returns false when URL missing or SELECT fails.
 */
export async function pingPostgresFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const url = env[CONNECTION.envVar]?.trim();
  if (!url) {
    return false;
  }
  const sql = postgres(url, {
    max: 1,
    connect_timeout: 2,
    idle_timeout: 1,
    max_lifetime: 5,
  });
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
