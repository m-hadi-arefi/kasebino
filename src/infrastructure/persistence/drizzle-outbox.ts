/**
 * Drizzle OutboxStore + ProcessedSet + DeadLetterStore (ADR-093 / ADR-035 / ADR-109).
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { DrizzleDb } from "../database/drizzle/client.js";
import {
  outboxDeadLetters,
  outboxEvents,
  processedEvents,
} from "../database/schema/platform.js";
import type { EventEnvelope } from "../../event-driven/index.js";
import type { OutboxConsumerName } from "../../event-driven/index.js";
import {
  createOutboxMessage,
  type DeadLetterRecordInput,
  type DeadLetterStore,
  type EnqueueOutboxInput,
  type OutboxMessage,
  type OutboxStore,
  type ProcessedSet,
} from "../../outbox/index.js";

type OutboxRow = typeof outboxEvents.$inferSelect;

function toMessage(row: OutboxRow): OutboxMessage {
  const envelope = JSON.parse(row.payloadJson) as EventEnvelope;
  return {
    id: row.id,
    eventId: row.eventId,
    eventType: row.eventType,
    merchantId: row.merchantId,
    storeId: row.storeId,
    aggregateId: row.aggregateId,
    aggregateType: row.aggregateType,
    envelope,
    payloadVersion: row.payloadVersion,
    correlationId: row.correlationId,
    causationId: row.causationId,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
  };
}

export class DrizzleOutboxStore implements OutboxStore {
  constructor(private readonly db: DrizzleDb) {}

  async enqueue(input: EnqueueOutboxInput): Promise<OutboxMessage> {
    const message = createOutboxMessage(input);
    await this.db.insert(outboxEvents).values({
      id: message.id,
      eventId: message.eventId,
      eventType: message.eventType,
      merchantId: message.merchantId,
      storeId: message.storeId,
      aggregateId: message.aggregateId,
      aggregateType: message.aggregateType,
      payloadJson: JSON.stringify(message.envelope),
      payloadVersion: message.payloadVersion,
      correlationId: message.correlationId,
      causationId: message.causationId,
      occurredAt: message.occurredAt,
      createdAt: message.createdAt,
      publishedAt: null,
      attemptCount: 0,
      lastError: null,
    });
    return message;
  }

  async pollPending(limit: number): Promise<OutboxMessage[]> {
    const rows = await this.db
      .select()
      .from(outboxEvents)
      .where(isNull(outboxEvents.publishedAt))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(limit);
    return rows.map(toMessage);
  }

  async markPublished(id: string, publishedAt: Date = new Date()): Promise<void> {
    const result = await this.db
      .update(outboxEvents)
      .set({
        publishedAt,
        lastError: null,
      })
      .where(eq(outboxEvents.id, id))
      .returning({ id: outboxEvents.id });
    if (result.length === 0) {
      throw new Error(`Outbox message "${id}" not found (ADR-035).`);
    }
  }

  async markAttemptFailed(id: string, error: string): Promise<void> {
    const result = await this.db
      .update(outboxEvents)
      .set({
        attemptCount: sql`${outboxEvents.attemptCount} + 1`,
        lastError: error,
      })
      .where(eq(outboxEvents.id, id))
      .returning({ id: outboxEvents.id });
    if (result.length === 0) {
      throw new Error(`Outbox message "${id}" not found (ADR-035).`);
    }
  }

  async getById(id: string): Promise<OutboxMessage | null> {
    const rows = await this.db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.id, id))
      .limit(1);
    return rows[0] ? toMessage(rows[0]) : null;
  }
}

export class DrizzleProcessedSet implements ProcessedSet {
  constructor(private readonly db: DrizzleDb) {}

  async tryMarkProcessed(
    eventId: string,
    consumer: OutboxConsumerName,
  ): Promise<boolean> {
    try {
      await this.db.insert(processedEvents).values({
        id: randomUUID(),
        eventId,
        consumer,
        processedAt: new Date(),
      });
      return true;
    } catch {
      const existing = await this.hasProcessed(eventId, consumer);
      if (existing) return false;
      throw new Error(
        `Failed to mark processed ${consumer}:${eventId} (ADR-035)`,
      );
    }
  }

  async hasProcessed(
    eventId: string,
    consumer: OutboxConsumerName,
  ): Promise<boolean> {
    const rows = await this.db
      .select({ id: processedEvents.id })
      .from(processedEvents)
      .where(
        and(
          eq(processedEvents.eventId, eventId),
          eq(processedEvents.consumer, consumer),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}

/** ADR-109 — persist poison outbox rows after max retries. */
export class DrizzleDeadLetterStore implements DeadLetterStore {
  constructor(private readonly db: DrizzleDb) {}

  async record(input: DeadLetterRecordInput): Promise<void> {
    const at = input.deadLetteredAt ?? new Date();
    await this.db.insert(outboxDeadLetters).values({
      id: randomUUID(),
      outboxId: input.outboxId,
      eventId: input.message.eventId,
      eventType: input.message.eventType,
      merchantId: input.message.merchantId,
      storeId: input.message.storeId,
      payloadJson: JSON.stringify(input.message.envelope),
      attemptCount: input.message.attemptCount,
      lastError: input.error,
      deadLetteredAt: at,
    });
  }

  async list(limit = 100) {
    const rows = await this.db
      .select()
      .from(outboxDeadLetters)
      .orderBy(asc(outboxDeadLetters.deadLetteredAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      outboxId: r.outboxId,
      eventId: r.eventId,
      eventType: r.eventType,
      lastError: r.lastError,
      attemptCount: r.attemptCount,
      deadLetteredAt: r.deadLetteredAt,
    }));
  }
}
