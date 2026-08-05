/**
 * Mongo adapter for ProductAnalyticsStore → mos_product (ADR-059 / ADR-110).
 */

import type { Collection, Db } from "mongodb";

import {
  type ProductAnalyticsDocument,
  type ProductAnalyticsInsertResult,
  type ProductAnalyticsStore,
} from "../../product-analytics/index.js";
import { MONGO_COLLECTIONS } from "../../mongodb-analytics/index.js";

export class MongodbProductAnalyticsStore implements ProductAnalyticsStore {
  private readonly col: Collection<ProductAnalyticsDocument>;
  private readonly ready: Promise<void>;

  constructor(db: Db, ready: Promise<void> = Promise.resolve()) {
    this.col = db.collection<ProductAnalyticsDocument>(MONGO_COLLECTIONS.product);
    this.ready = ready;
  }

  async insertIdempotent(
    doc: ProductAnalyticsDocument,
  ): Promise<ProductAnalyticsInsertResult> {
    if (!doc.merchantId?.trim()) {
      throw new Error(
        "Merchant-scoped product analytics must include merchantId (ADR-059 / ADR-056).",
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

  async findByEventId(
    eventId: string,
  ): Promise<ProductAnalyticsDocument | null> {
    await this.ready;
    const existing = await this.col.findOne({ eventId });
    return existing ? stripMongoId(existing) : null;
  }

  async findByMerchant(input: {
    merchantId: string;
    featureKey?: string;
    funnelId?: string;
    limit?: number;
  }): Promise<ProductAnalyticsDocument[]> {
    if (!input.merchantId?.trim()) {
      throw new Error(
        "Merchant-scoped product analytics query requires merchantId (ADR-059 / ADR-056).",
      );
    }
    await this.ready;
    const filter: Record<string, unknown> = { merchantId: input.merchantId };
    if (input.featureKey) filter.featureKey = input.featureKey;
    if (input.funnelId) filter.funnelId = input.funnelId;
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
  doc: ProductAnalyticsDocument & { _id?: unknown },
): ProductAnalyticsDocument {
  const { _id, ...rest } = doc; void _id;
  return {
    ...rest,
    occurredAt: asIso(rest.occurredAt),
    ingestedAt: asIso(rest.ingestedAt),
    properties: structuredClone(rest.properties),
  };
}
