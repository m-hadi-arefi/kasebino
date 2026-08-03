/**
 * Thin MongoDB connection stub (ADR-056).
 *
 * Resolves MONGODB_URL for analytics/audit infrastructure layers. Does not
 * open a protocol connection at import time and does not add the official
 * `mongodb` driver dependency yet. Warehouse ingest contract →
 * `src/event-warehouse/` (ADR-057); failure isolation → ADR-065.
 * Prefer module-owned adapters over global singletons when wiring real usage
 * (docs/tech/mongodb.md).
 */

import { CONNECTION } from "../../mongodb-analytics/index.js";

export type MongodbConnectionConfig = {
  url: string;
  envVar: typeof CONNECTION.envVar;
  databaseHint: typeof CONNECTION.defaultDatabase;
};

function looksLikeMongodbUrl(url: string): boolean {
  return (
    url.startsWith("mongodb://") ||
    url.startsWith("mongodb+srv://")
  );
}

/**
 * Resolve Mongo URL from env without connecting.
 */
export function createMongodbConfig(url: string): MongodbConnectionConfig {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error(
      `${CONNECTION.envVar} must be a non-empty mongodb URL (ADR-056).`,
    );
  }
  if (!looksLikeMongodbUrl(trimmed)) {
    throw new Error(
      `${CONNECTION.envVar} must use mongodb:// or mongodb+srv:// scheme (ADR-056); got "${trimmed}".`,
    );
  }
  return {
    url: trimmed,
    envVar: CONNECTION.envVar,
    databaseHint: CONNECTION.defaultDatabase,
  };
}

/**
 * Build Mongo connection config from process env. Requires MONGODB_URL.
 */
export function createMongodbConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): MongodbConnectionConfig {
  const url = env[CONNECTION.envVar];
  if (!url) {
    throw new Error(
      `${CONNECTION.envVar} is required for the MongoDB analytics client stub (ADR-056).`,
    );
  }
  return createMongodbConfig(url);
}
