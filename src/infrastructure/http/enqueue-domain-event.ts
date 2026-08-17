/**
 * ADR-097 / ADR-107 — enqueue domain events to transactional outbox;
 * best-effort in-app notification create until ADR-109 worker is live.
 */

import { envelopeFromDomainEvent } from "../../events/contracts/event-driven/index.js";
import type { OutboxStore } from "../../events/outbox/index.js";
import type { DomainEventBase } from "../../shared/ddd/index.js";
import type { CacheAsideStorePort } from "../redis/cache-aside/port.js";
import {
  invalidateOnEvent,
  type InvalidateOnEventInput,
} from "../redis/cache-invalidation/index.js";
import type { NotificationsUseCases } from "../../modules/notifications/application/use-cases.js";

export async function enqueueDomainEvent(input: {
  outbox?: OutboxStore | undefined;
  cache?: CacheAsideStorePort | undefined;
  /** ADR-107 — idempotent createFromEnvelope; never fails the write path. */
  notifications?: NotificationsUseCases | undefined;
  env?: string | undefined;
  domainEvent: DomainEventBase & { payload: Record<string, unknown> };
  merchantId: string;
  storeId?: string | null | undefined;
}): Promise<void> {
  const envelope = envelopeFromDomainEvent({
    domainEvent: input.domainEvent,
    merchantId: input.merchantId,
    ...(input.storeId ? { storeId: input.storeId } : {}),
  });

  if (input.outbox) {
    await input.outbox.enqueue({
      envelope,
      aggregateId: input.domainEvent.aggregateId,
      aggregateType: input.domainEvent.aggregateType,
    });
  }

  // ADR-107/109 — best-effort in-app create until worker consumers catch up;
  // idempotent with worker `notifications` consumer via sourceEventId.
  // Awaited but never rethrows so write responses stay reliable.
  if (input.notifications) {
    try {
      await input.notifications.createFromEnvelope(envelope);
    } catch {
      /* never block core path */
    }
  }

  if (!input.cache) return;

  const payload = input.domainEvent.payload;
  const env = input.env ?? (process.env.MOS_ENV?.trim() || "local");
  const eventType = input.domainEvent.eventName;
  const merchantId = input.merchantId;
  const productId =
    typeof payload.productId === "string"
      ? payload.productId
      : input.domainEvent.aggregateId;
  const barcode =
    typeof payload.barcode === "string" ? payload.barcode : undefined;
  const storeId =
    typeof payload.storeId === "string"
      ? payload.storeId
      : (input.storeId ?? undefined);

  let invalidation: InvalidateOnEventInput;
  if (
    eventType === "ProductUpdated" ||
    eventType === "ProductCreated" ||
    eventType === "ProductDeleted"
  ) {
    invalidation = {
      env,
      eventType,
      payload: {
        merchantId,
        productId,
        ...(barcode !== undefined ? { barcode } : {}),
      },
    };
  } else if (eventType === "InventoryChanged" && storeId) {
    invalidation = {
      env,
      eventType: "InventoryChanged",
      payload: { merchantId, storeId, productId },
    };
  } else if (eventType === "SaleCompleted" && storeId) {
    invalidation = {
      env,
      eventType: "SaleCompleted",
      payload: { merchantId, storeId },
    };
  } else if (eventType === "StoreUpdated" && storeId) {
    invalidation = {
      env,
      eventType: "StoreUpdated",
      payload: { merchantId, storeId },
    };
  } else {
    invalidation = {
      env,
      eventType,
      payload: { merchantId },
    };
  }

  await invalidateOnEvent(input.cache, invalidation);
}
