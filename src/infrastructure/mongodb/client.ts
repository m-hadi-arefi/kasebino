/**
 * MongoDB connection config + live client factory (ADR-056 / ADR-110).
 *
 * Resolves MONGODB_URL for analytics/audit infrastructure layers.
 * Mongo is NEVER OLTP SoT — warehouse/audit/telemetry only.
 * Prefer module-owned adapters over global singletons when wiring
 * (docs/tech/mongodb.md).
 */

import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

import { CONNECTION, MONGO_ENGINE } from "../../mongodb-analytics/index.js";

export type MongodbConnectionConfig = {
  url: string;
  envVar: typeof CONNECTION.envVar;
  databaseHint: typeof CONNECTION.defaultDatabase;
};

export type MerchantOsMongoClient = MongoClient;

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
      `${CONNECTION.envVar} is required for the MongoDB analytics client (ADR-056 / ADR-110).`,
    );
  }
  return createMongodbConfig(url);
}

/**
 * Database name from URL pathname, falling back to default analytics DB.
 */
export function resolveMongodbDatabaseName(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, "").trim();
    if (path && path !== "") {
      return decodeURIComponent(path);
    }
  } catch {
    /* fall through */
  }
  return MONGO_ENGINE.defaultDatabase;
}

/**
 * Create a MongoClient (does not connect yet).
 */
export function createMongoClient(
  url: string,
  options?: MongoClientOptions,
): MerchantOsMongoClient {
  const config = createMongodbConfig(url);
  return new MongoClient(config.url, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5_000,
    ...options,
  });
}

/**
 * Create + connect a Mongo client. Rejects when unreachable.
 */
export async function connectMongoClient(
  url: string,
  options?: MongoClientOptions,
): Promise<{ client: MerchantOsMongoClient; db: Db }> {
  const client = createMongoClient(url, options);
  await client.connect();
  const dbName = resolveMongodbDatabaseName(url);
  return { client, db: client.db(dbName) };
}

/**
 * Create client and start connect() without awaiting — adapters gate on ready.
 */
export function createMongoClientConnecting(
  url: string,
  options?: MongoClientOptions,
): {
  client: MerchantOsMongoClient;
  db: Db;
  ready: Promise<void>;
} {
  const client = createMongoClient(url, options);
  const dbName = resolveMongodbDatabaseName(url);
  const db = client.db(dbName);
  const ready = client.connect().then(() => undefined);
  return { client, db, ready };
}

/**
 * Ping Mongo via MONGODB_URL. Returns false when URL missing or ping fails.
 */
export async function pingMongoFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const url = env[CONNECTION.envVar]?.trim();
  if (!url) {
    return false;
  }
  let client: MerchantOsMongoClient | undefined;
  try {
    const connected = await connectMongoClient(url);
    client = connected.client;
    const result = await connected.db.command({ ping: 1 });
    return result.ok === 1;
  } catch {
    return false;
  } finally {
    if (client) {
      await client.close().catch(() => undefined);
    }
  }
}
