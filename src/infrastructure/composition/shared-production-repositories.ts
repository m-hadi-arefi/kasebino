/**
 * ADR-123 — process-scoped shared ProductionRepositories.
 * App Router + OTP (same process) reuse one Drizzle client/repo graph.
 * Worker process has its own singleton (separate Node process — OK).
 *
 * Next.js HMR caveat: store on globalThis so Fast Refresh does not multiply pools.
 */

import {
  createProductionRepositories,
  type ProductionRepositories,
} from "../persistence/create-production-repositories.js";
import { assertDatabaseUrlForComposition } from "./production-guards.js";

const GLOBAL_REPOS_KEY = "__merchantos_shared_production_repos__" as const;

type SharedReposSlot = {
  repos: ProductionRepositories | null;
  fingerprint: string | null;
};

function slot(): SharedReposSlot {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_REPOS_KEY]?: SharedReposSlot;
  };
  if (!g[GLOBAL_REPOS_KEY]) {
    g[GLOBAL_REPOS_KEY] = { repos: null, fingerprint: null };
  }
  return g[GLOBAL_REPOS_KEY];
}

function fingerprint(env: NodeJS.ProcessEnv): string {
  return env.DATABASE_URL?.trim() ?? "";
}

/**
 * Lazy singleton ProductionRepositories for the current process.
 * Always constructs via createProductionRepositories (Drizzle-only).
 */
export function getSharedProductionRepositories(
  env: NodeJS.ProcessEnv = process.env,
): ProductionRepositories {
  assertDatabaseUrlForComposition(env);
  const s = slot();
  const fp = fingerprint(env);
  if (!s.repos || s.fingerprint !== fp) {
    s.repos = createProductionRepositories(env);
    s.fingerprint = fp;
  }
  return s.repos;
}

/** Test helper — drop shared repos so the next call rebuilds. */
export function resetSharedProductionRepositoriesForTests(): void {
  const s = slot();
  s.repos = null;
  s.fingerprint = null;
}
