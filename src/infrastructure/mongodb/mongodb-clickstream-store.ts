/**
 * Mongo adapter for ClickstreamStore → mos_behavior (ADR-060 / ADR-110).
 */

import type { Collection, Db } from "mongodb";

import {
  type ClickstreamDocument,
  type ClickstreamInsertResult,
  type ClickstreamStore,
} from "../../clickstream/index.js";
import { MONGO_COLLECTIONS } from "../../mongodb-analytics/index.js";

export class MongodbClickstreamStore implements ClickstreamStore {
  private readonly col: Collection<ClickstreamDocument>;
  private readonly ready: Promise<void>;

  constructor(db: Db, ready: Promise<void> = Promise.resolve()) {
    this.col = db.collection<ClickstreamDocument>(MONGO_COLLECTIONS.behavior);
    this.ready = ready;
  }

  async insertIdempotent(
    doc: ClickstreamDocument,
  ): Promise<ClickstreamInsertResult> {
    if (!doc.merchantId?.trim()) {
      throw new Error(
        "Merchant-scoped clickstream documents must include merchantId (ADR-060 / ADR-056).",
      );
    }
    await this.ready;
    try {
      await this.col.insertOne({
        ...doc,
        properties: structuredClone(doc.properties),
        occurredAt: new Date(doc.occurredAt) as unknown as string,
        ingestedAt: new Date(doc.ingestedAt) as unknown as string,
      });
      return { status: "inserted", eventId: doc.eventId };
    } catch (err) {
      if (isDuplicateKey(err)) {
        return { status: "duplicate", eventId: doc.eventId };
      }
      throw err;
    }
  }

  async findByEventId(eventId: string): Promise<ClickstreamDocument | null> {
    await this.ready;
    const existing = await this.col.findOne({ eventId });
    return existing ? stripMongoId(existing) : null;
  }

  async findByMerchant(input: {
    merchantId: string;
    storeId?: string;
    eventType?: string;
    sessionId?: string;
    limit?: number;
  }): Promise<ClickstreamDocument[]> {
    if (!input.merchantId?.trim()) {
      throw new Error(
        "Merchant-scoped clickstream query requires merchantId (ADR-060 / ADR-056).",
      );
    }
    await this.ready;
    const filter: Record<string, unknown> = { merchantId: input.merchantId };
    if (input.storeId) filter.storeId = input.storeId;
    if (input.eventType) filter.eventType = input.eventType;
    if (input.sessionId) filter.sessionId = input.sessionId;
    const rows = await this.col
      .find(filter)
      .sort({ occurredAt: -1 })
      .limit(input.limit ?? 100)
      .toArray();
    return rows.map(stripMongoId);
  }

  async count(): Promise<number> {
    await this.ready;
    return this.col.countDocuments();
  }
}

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}

function stripMongoId(
  doc: ClickstreamDocument & { _id?: unknown },
): ClickstreamDocument {
  const { _id, ...rest } = doc; void _id;
  return {
    ...rest,
    occurredAt: asIso(rest.occurredAt),
    ingestedAt: asIso(rest.ingestedAt),
    properties: structuredClone(rest.properties),
  };
}
