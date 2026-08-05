/**
 * Mongo adapter for AuditStore → mos_audit (ADR-058 / ADR-110).
 */

import type { Collection, Db } from "mongodb";

import {
  assertAuditDocumentShape,
  type AuditDocument,
  type AuditInsertResult,
  type AuditSearchInput,
  type AuditStore,
} from "../../audit-logging/index.js";
import { MONGO_COLLECTIONS } from "../../mongodb-analytics/index.js";

export class MongodbAuditStore implements AuditStore {
  private readonly col: Collection<AuditDocument>;
  private readonly ready: Promise<void>;

  constructor(db: Db, ready: Promise<void> = Promise.resolve()) {
    this.col = db.collection<AuditDocument>(MONGO_COLLECTIONS.audit);
    this.ready = ready;
  }

  async insertIdempotent(doc: AuditDocument): Promise<AuditInsertResult> {
    assertAuditDocumentShape(doc);
    await this.ready;
    try {
      await this.col.insertOne({
        ...doc,
        before: structuredClone(doc.before),
        after: structuredClone(doc.after),
        metadata: structuredClone(doc.metadata),
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

  async findByEventId(eventId: string): Promise<AuditDocument | null> {
    await this.ready;
    const existing = await this.col.findOne({ eventId });
    return existing ? stripMongoId(existing) : null;
  }

  async search(input: AuditSearchInput): Promise<AuditDocument[]> {
    await this.ready;
    const filter: Record<string, unknown> = {};

    if (input.merchantId !== undefined && input.merchantId !== null) {
      filter.merchantId = input.merchantId;
    } else if (!input.includePlatformScope) {
      throw new Error(
        "Merchant-scoped audit search requires merchantId (ADR-058 / ADR-056).",
      );
    }

    if (input.actorId) filter.actorId = input.actorId;
    if (input.action) filter.action = input.action;
    if (input.entityType) filter.entityType = input.entityType;
    if (input.entityId !== undefined) filter.entityId = input.entityId;
    if (input.result) filter.result = input.result;

    if (input.fromOccurredAt || input.toOccurredAt) {
      const range: Record<string, string> = {};
      if (input.fromOccurredAt) range.$gte = input.fromOccurredAt;
      if (input.toOccurredAt) range.$lte = input.toOccurredAt;
      filter.occurredAt = range;
    }

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

function stripMongoId(doc: AuditDocument & { _id?: unknown }): AuditDocument {
  const { _id, ...rest } = doc; void _id;
  return {
    ...rest,
    occurredAt: asIso(rest.occurredAt),
    ingestedAt: asIso(rest.ingestedAt),
    before: structuredClone(rest.before),
    after: structuredClone(rest.after),
    metadata: structuredClone(rest.metadata),
  };
}
