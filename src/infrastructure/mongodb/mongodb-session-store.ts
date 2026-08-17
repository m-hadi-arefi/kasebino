/**
 * Mongo adapter for SessionStore → mos_sessions (ADR-061 / ADR-110).
 *
 * Session aggregates stored as documents; lifecycle events embedded for
 * idempotency on eventId (sparse unique index).
 */

import type { Collection, Db } from "mongodb";

import {
  assertSessionDocumentShape,
  type SessionDocument,
  type SessionInsertResult,
  type SessionLifecycleEvent,
  type SessionStatus,
  type SessionStore,
} from "../../modules/analytics/domain/session/index.js";
import { MONGO_SESSION_COLLECTION } from "./contracts/analytics/index.js";

type SessionMongoDoc = SessionDocument & {
  lifecycleEvents?: SessionLifecycleEvent[];
};

export class MongodbSessionStore implements SessionStore {
  private readonly col: Collection<SessionMongoDoc>;
  private readonly ready: Promise<void>;

  constructor(db: Db, ready: Promise<void> = Promise.resolve()) {
    this.col = db.collection<SessionMongoDoc>(MONGO_SESSION_COLLECTION);
    this.ready = ready;
  }

  async upsertFromLifecycle(
    session: SessionDocument,
    event: SessionLifecycleEvent,
  ): Promise<SessionInsertResult> {
    assertSessionDocumentShape(session);
    await this.ready;

    const dup = await this.col.findOne({
      "lifecycleEvents.eventId": event.eventId,
    });
    if (dup) {
      return { status: "duplicate_event", eventId: event.eventId };
    }

    const existing = await this.col.findOne({ sessionId: session.sessionId });
    const stored: SessionMongoDoc = {
      ...session,
      properties: structuredClone(session.properties),
      // BSON Date for TTL on startedAt (ADR-064).
      startedAt: new Date(session.startedAt) as unknown as string,
      lastHeartbeatAt: new Date(session.lastHeartbeatAt) as unknown as string,
      endedAt: session.endedAt
        ? (new Date(session.endedAt) as unknown as string)
        : null,
      lifecycleEvents: [
        ...(existing?.lifecycleEvents ?? []),
        {
          ...event,
          properties: structuredClone(event.properties),
          occurredAt: new Date(event.occurredAt) as unknown as string,
          ingestedAt: new Date(event.ingestedAt) as unknown as string,
        },
      ],
    };

    await this.col.replaceOne(
      { sessionId: session.sessionId },
      stored,
      { upsert: true },
    );

    return existing
      ? { status: "updated", sessionId: session.sessionId }
      : { status: "inserted", sessionId: session.sessionId };
  }

  async findBySessionId(sessionId: string): Promise<SessionDocument | null> {
    await this.ready;
    const existing = await this.col.findOne({ sessionId });
    return existing ? stripSession(existing) : null;
  }

  async findByMerchant(input: {
    merchantId: string;
    storeId?: string;
    status?: SessionStatus;
    limit?: number;
  }): Promise<SessionDocument[]> {
    if (!input.merchantId?.trim()) {
      throw new Error(
        "Merchant-scoped session query requires merchantId (ADR-061 / ADR-056).",
      );
    }
    await this.ready;
    const filter: Record<string, unknown> = { merchantId: input.merchantId };
    if (input.storeId) filter.storeId = input.storeId;
    if (input.status) filter.status = input.status;
    const rows = await this.col
      .find(filter)
      .sort({ startedAt: -1 })
      .limit(input.limit ?? 100)
      .toArray();
    return rows.map(stripSession);
  }

  async findEventById(eventId: string): Promise<SessionLifecycleEvent | null> {
    await this.ready;
    const row = await this.col.findOne({
      "lifecycleEvents.eventId": eventId,
    });
    const match = row?.lifecycleEvents?.find((e) => e.eventId === eventId);
    return match
      ? { ...match, properties: structuredClone(match.properties) }
      : null;
  }

  async count(): Promise<number> {
    await this.ready;
    return this.col.countDocuments();
  }
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}

function stripSession(doc: SessionMongoDoc & { _id?: unknown }): SessionDocument {
  const { _id, lifecycleEvents, ...rest } = doc; void _id; void lifecycleEvents;
  return {
    ...rest,
    startedAt: asIso(rest.startedAt),
    lastHeartbeatAt: asIso(rest.lastHeartbeatAt),
    endedAt: rest.endedAt ? asIso(rest.endedAt) : null,
    properties: structuredClone(rest.properties),
  };
}
