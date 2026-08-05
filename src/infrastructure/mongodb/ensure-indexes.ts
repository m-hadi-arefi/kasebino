/**
 * ADR-110 — ensure Mongo analytics indexes + TTL (ADR-064 MONGO_TTL_TABLE).
 */

import type { Db, IndexDescription } from "mongodb";

import {
  MONGO_COLLECTIONS,
  MONGO_SESSION_COLLECTION,
} from "../../mongodb-analytics/index.js";
import { MONGO_TTL_TABLE } from "../../data-retention/index.js";

export type EnsuredIndex = {
  collection: string;
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
  expireAfterSeconds?: number;
};

function indexSpecsForCollection(
  collection: string,
): Array<IndexDescription & { name: string }> {
  const specs: Array<IndexDescription & { name: string }> = [];

  if (collection === MONGO_COLLECTIONS.events) {
    specs.push(
      {
        name: "uniq_eventId",
        key: { eventId: 1 },
        unique: true,
      },
      {
        name: "tenant_time",
        key: { merchantId: 1, occurredAt: -1 },
      },
      {
        name: "eventType_time",
        key: { eventType: 1, occurredAt: -1 },
      },
      {
        name: "ttl_ingestedAt",
        key: { ingestedAt: 1 },
        expireAfterSeconds: MONGO_TTL_TABLE.warehouse.expireAfterSecondsDefault,
      },
    );
  }

  if (collection === MONGO_COLLECTIONS.audit) {
    specs.push(
      {
        name: "uniq_eventId",
        key: { eventId: 1 },
        unique: true,
      },
      {
        name: "merchant_time",
        key: { merchantId: 1, occurredAt: -1 },
      },
      {
        name: "actor_time",
        key: { actorId: 1, occurredAt: -1 },
      },
      {
        name: "action_time",
        key: { action: 1, occurredAt: -1 },
      },
      {
        name: "ttl_occurredAt",
        key: { occurredAt: 1 },
        expireAfterSeconds: MONGO_TTL_TABLE.audit.expireAfterSecondsDefault,
      },
    );
  }

  if (collection === MONGO_COLLECTIONS.behavior) {
    specs.push(
      {
        name: "uniq_eventId",
        key: { eventId: 1 },
        unique: true,
      },
      {
        name: "session_time",
        key: { sessionId: 1, occurredAt: -1 },
      },
      {
        name: "merchant_time",
        key: { merchantId: 1, occurredAt: -1 },
      },
      {
        name: "ttl_occurredAt",
        key: { occurredAt: 1 },
        expireAfterSeconds: MONGO_TTL_TABLE.clickstream.expireAfterSecondsDefault,
      },
    );
  }

  if (collection === MONGO_COLLECTIONS.product) {
    specs.push(
      {
        name: "uniq_eventId",
        key: { eventId: 1 },
        unique: true,
      },
      {
        name: "merchant_time",
        key: { merchantId: 1, occurredAt: -1 },
      },
      {
        name: "ttl_occurredAt",
        key: { occurredAt: 1 },
        expireAfterSeconds: MONGO_TTL_TABLE.clickstream.expireAfterSecondsDefault,
      },
    );
  }

  if (collection === MONGO_SESSION_COLLECTION) {
    specs.push(
      {
        name: "uniq_sessionId",
        key: { sessionId: 1 },
        unique: true,
      },
      {
        name: "uniq_lifecycle_eventId",
        key: { "lifecycleEvents.eventId": 1 },
        unique: true,
        sparse: true,
      },
      {
        name: "merchant_time",
        key: { merchantId: 1, startedAt: -1 },
      },
      {
        name: "ttl_startedAt",
        key: { startedAt: 1 },
        expireAfterSeconds: MONGO_TTL_TABLE.sessions.expireAfterSecondsDefault,
      },
    );
  }

  return specs;
}

const RETENTION_COLLECTIONS = [
  MONGO_COLLECTIONS.events,
  MONGO_COLLECTIONS.audit,
  MONGO_COLLECTIONS.behavior,
  MONGO_COLLECTIONS.product,
  MONGO_SESSION_COLLECTION,
] as const;

/**
 * CreateIndexes for analytics plane collections (idempotent).
 * Call after connect; failures should not block OLTP callers.
 */
export async function ensureAnalyticsIndexes(db: Db): Promise<EnsuredIndex[]> {
  const ensured: EnsuredIndex[] = [];

  for (const collection of RETENTION_COLLECTIONS) {
    const col = db.collection(collection);
    const specs = indexSpecsForCollection(collection);
    for (const spec of specs) {
      const { name, key, ...rest } = spec;
      await col.createIndex(key, { name, ...rest });
      ensured.push({
        collection,
        name,
        key: key as Record<string, 1 | -1>,
        ...(rest.unique ? { unique: true } : {}),
        ...(typeof rest.expireAfterSeconds === "number"
          ? { expireAfterSeconds: rest.expireAfterSeconds }
          : {}),
      });
    }
  }

  return ensured;
}

/** List TTL indexes currently present (for acceptance tests). */
export async function listTtlIndexes(
  db: Db,
): Promise<
  Array<{ collection: string; name: string; expireAfterSeconds: number }>
> {
  const out: Array<{
    collection: string;
    name: string;
    expireAfterSeconds: number;
  }> = [];

  for (const collection of RETENTION_COLLECTIONS) {
    const indexes = await db.collection(collection).indexes();
    for (const idx of indexes) {
      if (typeof idx.expireAfterSeconds === "number") {
        out.push({
          collection,
          name: String(idx.name ?? "unnamed"),
          expireAfterSeconds: idx.expireAfterSeconds,
        });
      }
    }
  }
  return out;
}
