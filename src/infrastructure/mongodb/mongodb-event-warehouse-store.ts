/**
 * Mongo adapter for EventWarehouseStore → mos_events (ADR-057 / ADR-110).
 */

import type { Collection, Db } from "mongodb";

import {
  assertWarehouseDocumentShape,
  type EventWarehouseInsertResult,
  type EventWarehouseStore,
  type WarehouseDocument,
} from "../../event-warehouse/index.js";
import { MONGO_COLLECTIONS } from "../../mongodb-analytics/index.js";

export class MongodbEventWarehouseStore implements EventWarehouseStore {
  private readonly col: Collection<WarehouseDocument>;
  private readonly ready: Promise<void>;

  constructor(db: Db, ready: Promise<void> = Promise.resolve()) {
    this.col = db.collection<WarehouseDocument>(MONGO_COLLECTIONS.events);
    this.ready = ready;
  }

  async insertIdempotent(
    doc: WarehouseDocument,
  ): Promise<EventWarehouseInsertResult> {
    assertWarehouseDocumentShape(doc);
    await this.ready;
    try {
      await this.col.insertOne({
        ...doc,
        payload: structuredClone(doc.payload),
        // BSON Date so TTL index on ingestedAt works (ADR-064 / ADR-110).
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

  async findByEventId(eventId: string): Promise<WarehouseDocument | null> {
    await this.ready;
    const existing = await this.col.findOne({ eventId });
    return existing ? stripMongoId(existing) : null;
  }

  async findByMerchant(input: {
    merchantId: string;
    limit?: number;
    eventType?: string;
  }): Promise<WarehouseDocument[]> {
    if (!input.merchantId?.trim()) {
      throw new Error(
        "Warehouse domain documents must include merchantId (ADR-057 / ADR-056).",
      );
    }
    await this.ready;
    const filter: Record<string, unknown> = { merchantId: input.merchantId };
    if (input.eventType) filter.eventType = input.eventType;
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
  doc: WarehouseDocument & { _id?: unknown },
): WarehouseDocument {
  const { _id, ...rest } = doc; void _id;
  return {
    ...rest,
    occurredAt: asIso(rest.occurredAt),
    ingestedAt: asIso(rest.ingestedAt),
    payload: structuredClone(rest.payload),
  };
}
