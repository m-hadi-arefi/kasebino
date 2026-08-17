import { describe, expect, it, vi } from "vitest";

import { createEventEnvelope, scrubEnvelopeForLogs } from "../contracts/event-driven/index.js";
import { DEPLOYABLE, OUTBOX_SPINE } from "../../shared/contracts/modular-monolith/index.js";
import {
  LOYALTY_EXPIRY_POLICY,
  PICKUP_TIMER_POLICY,
} from "../../shared/contracts/mvp-policies/index.js";
import {
  InMemoryDeadLetterStore,
  InMemoryOutboxStore,
  InMemoryProcessedSet,
  OUTBOX_POLL,
  OUTBOX_WORKER,
  OUTBOX_WORKER_DECISION,
  OUTBOX_WORKER_UX_FA,
  SCHEDULED_JOB_HOOKS,
  assertNoPiiInWorkerLogPayload,
  assertOutboxFeedsMatchSpine,
  assertWorkersShareCodebase,
  createOutboxWorker,
  runScheduledJobStub,
} from "./index.js";

describe("ADR-035 Background Jobs and Transactional Outbox", () => {
  it("decides transactional outbox worker with shared codebase and at-least-once", () => {
    expect(OUTBOX_WORKER_DECISION.pattern).toBe("transactional_outbox_worker");
    expect(OUTBOX_WORKER_DECISION.delivery).toBe("at_least_once");
    expect(OUTBOX_WORKER_DECISION.workersShareCodebase).toBe(true);
    expect(DEPLOYABLE.workersShareCodebase).toBe(true);
    expect(OUTBOX_WORKER.decision).toBe(OUTBOX_WORKER_DECISION);
    expect(OUTBOX_POLL.batchSize).toBe(50);
    expect(() => assertWorkersShareCodebase()).not.toThrow();
    expect(() => assertOutboxFeedsMatchSpine()).not.toThrow();
    expect(OUTBOX_WORKER.spine.feeds).toEqual(OUTBOX_SPINE.feeds);
  });

  it("enqueues and dispatches pending messages then marks published", async () => {
    const store = new InMemoryOutboxStore();
    const processed = new InMemoryProcessedSet();
    const seen: string[] = [];

    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-1",
      storeId: "s-1",
      payload: { saleId: "sale-1", phone: "09123456789" },
    });

    const queued = await store.enqueue({
      envelope,
      aggregateId: "sale-1",
      aggregateType: "Sale",
    });
    expect(queued.publishedAt).toBeNull();

    const worker = createOutboxWorker({
      store,
      processed,
      handlers: {
        cache_invalidation: (msg) => {
          seen.push(`cache:${msg.eventId}`);
        },
        notifications: (msg) => {
          seen.push(`notify:${msg.eventType}`);
        },
      },
    });

    const result = await worker.dispatchOnce();
    expect(result.polled).toBe(1);
    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(seen).toContain(`cache:${envelope.eventId}`);
    expect(seen).toContain("notify:SaleCompleted");

    const after = await store.getById(queued.id);
    expect(after?.publishedAt).not.toBeNull();

    const second = await worker.dispatchOnce();
    expect(second.polled).toBe(0);
    expect(second.published).toBe(0);
  });

  it("skips idempotent re-processing per consumer + eventId", async () => {
    const store = new InMemoryOutboxStore();
    const processed = new InMemoryProcessedSet();
    const cacheCalls = vi.fn();

    const envelope = createEventEnvelope({
      eventType: "MembershipCreated",
      merchantId: "m-1",
      storeId: "s-1",
      payload: { membershipId: "mem-1" },
    });
    await store.enqueue({ envelope });

    const worker = createOutboxWorker({
      store,
      processed,
      consumers: ["cache_invalidation"],
      handlers: { cache_invalidation: cacheCalls },
    });

    await worker.dispatchOnce();
    expect(cacheCalls).toHaveBeenCalledTimes(1);

    // Force another dispatch against already-processed consumer identity
    const pendingAgain = createEventEnvelope({
      eventType: "MembershipCreated",
      merchantId: "m-1",
      storeId: "s-1",
      eventId: envelope.eventId,
      payload: { membershipId: "mem-1" },
    });
    await store.enqueue({ envelope: pendingAgain });
    const result = await worker.dispatchOnce();
    expect(result.published).toBe(1);
    expect(result.skippedIdempotent).toBe(1);
    expect(cacheCalls).toHaveBeenCalledTimes(1);
  });

  it("records failures and increments attempt_count without marking published", async () => {
    const store = new InMemoryOutboxStore();
    const processed = new InMemoryProcessedSet();
    const envelope = createEventEnvelope({
      eventType: "InventoryChanged",
      merchantId: "m-1",
      storeId: "s-1",
      payload: { productId: "p-1" },
    });
    const queued = await store.enqueue({ envelope });

    const worker = createOutboxWorker({
      store,
      processed,
      consumers: ["emqx_realtime"],
      handlers: {
        emqx_realtime: () => {
          throw new Error("broker_down");
        },
      },
    });

    const result = await worker.dispatchOnce();
    expect(result.failed).toBe(1);
    expect(result.published).toBe(0);
    const after = await store.getById(queued.id);
    expect(after?.publishedAt).toBeNull();
    expect(after?.attemptCount).toBe(1);
    expect(after?.lastError).toMatch(/broker_down/);
  });

  it("exposes scheduled job hooks bound to mvp-policies timers", () => {
    expect(SCHEDULED_JOB_HOOKS.pickupUnpaidCancel.unpaidTimeoutMinutes).toBe(
      PICKUP_TIMER_POLICY.unpaidPendingPaymentTimeoutMinutes,
    );
    expect(SCHEDULED_JOB_HOOKS.pickupUnpaidCancel.unpaidTimeoutMinutes).toBe(30);
    expect(SCHEDULED_JOB_HOOKS.pickupUnpaidCancel.resultStatus).toBe("cancelled");
    expect(SCHEDULED_JOB_HOOKS.pickupUnpaidCancel.status).toBe("wired");
    expect(SCHEDULED_JOB_HOOKS.pickupReadyHoldCancel.holdHours).toBe(24);
    expect(SCHEDULED_JOB_HOOKS.pickupReadyHoldCancel.status).toBe("wired");
    expect(
      SCHEDULED_JOB_HOOKS.loyaltyPointsExpiry.defaultMonthsAfterLastEarn,
    ).toBe(LOYALTY_EXPIRY_POLICY.defaultMonthsAfterLastEarn);
    expect(SCHEDULED_JOB_HOOKS.loyaltyPointsExpiry.status).toBe("wired");
    expect(SCHEDULED_JOB_HOOKS.loyaltyPointsExpiry.eventName).toBe(
      "PointsExpired",
    );

    const unpaid = runScheduledJobStub("pickup_unpaid_cancel");
    expect(unpaid.status).toBe("stub_acknowledged");
    expect(unpaid.policySnapshot.unpaidTimeoutMinutes).toBe(30);
    expect(unpaid.messageFa).toMatch(/[\u0600-\u06FF]/);

    const loyalty = runScheduledJobStub("loyalty_points_expiry");
    expect(loyalty.status).toBe("use_loyalty_runner");
    expect(loyalty.policySnapshot.defaultMonthsAfterLastEarn).toBe(12);
  });

  it("moves poison messages to DLQ after max retries", async () => {
    const store = new InMemoryOutboxStore();
    const processed = new InMemoryProcessedSet();
    const deadLetter = new InMemoryDeadLetterStore();
    const envelope = createEventEnvelope({
      eventType: "InventoryChanged",
      merchantId: "m-1",
      storeId: "s-1",
      payload: { productId: "p-1" },
    });
    const queued = await store.enqueue({ envelope });

    const worker = createOutboxWorker({
      store,
      processed,
      deadLetter,
      maxRetries: 2,
      consumers: ["emqx_realtime"],
      handlers: {
        emqx_realtime: () => {
          throw new Error("broker_down");
        },
      },
    });

    const first = await worker.dispatchOnce();
    expect(first.failed).toBe(1);
    expect(first.deadLettered).toBe(0);
    expect((await store.getById(queued.id))?.publishedAt).toBeNull();

    const second = await worker.dispatchOnce();
    expect(second.deadLettered).toBe(1);
    expect(deadLetter.records).toHaveLength(1);
    expect(deadLetter.records[0]?.lastError).toMatch(/broker_down/);
    expect((await store.getById(queued.id))?.publishedAt).not.toBeNull();
    expect((await store.pollPending(10))).toHaveLength(0);
  });

  it("scrubs payloads for worker logs and keeps Persian UX stubs", () => {
    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-1",
      payload: { phone: "09120000000" },
    });
    const scrubbed = scrubEnvelopeForLogs(envelope);
    expect(() => assertNoPiiInWorkerLogPayload(scrubbed)).not.toThrow();
    expect(OUTBOX_WORKER_UX_FA.SALE_COMPLETED_TOAST).toMatch(/فروش/);
    expect(OUTBOX_WORKER_UX_FA.JOB_PICKUP_UNPAID_CANCELLED).toMatch(/لغو/);
    expect(OUTBOX_WORKER_UX_FA.dir).toBe("rtl");
  });
});
