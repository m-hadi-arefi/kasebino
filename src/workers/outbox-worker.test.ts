/**
 * ADR-109 — outbox worker + scheduled jobs + EMQX publish acceptance tests.
 */

import { describe, expect, it } from "vitest";

import { createEventEnvelope } from "../event-driven/index.js";
import {
  createEmqxOutboxHandler,
  InMemoryMqttBroker,
} from "../emqx-realtime/index.js";
import { resolveMqttRuntimeMode } from "../infrastructure/emqx/client.js";
import {
  createLoyaltyUseCases,
  runLoyaltyPointsExpiryJob,
  InMemoryPointRuleRepository,
  InMemoryPointsLedgerRepository,
  InMemoryWalletRepository,
  addCalendarMonths,
} from "../modules/loyalty/index.js";
import {
  createOrderingUseCases,
  InMemoryOrderRepository,
} from "../modules/ordering/index.js";
import {
  createOutboxWorker,
  InMemoryDeadLetterStore,
  InMemoryOutboxStore,
  InMemoryProcessedSet,
  OUTBOX_WORKER_UX_FA,
  runScheduledJob,
  SCHEDULED_JOB_HOOKS,
} from "../outbox/index.js";
import {
  CollectingOutboxMetrics,
  createOutboxWorkerRuntime,
} from "./create-outbox-runtime.js";

function sampleLines() {
  return [
    {
      id: "line-1",
      productId: "prod-1",
      productName: "چیپس نمکی",
      quantity: 2,
      unitPriceMinor: 50_000n,
    },
  ];
}

describe("ADR-109 Outbox worker + EMQX + scheduled jobs", () => {
  it("publishes SaleCompleted to merchant sales MQTT topic", async () => {
    const broker = new InMemoryMqttBroker();
    const metrics = new CollectingOutboxMetrics();
    const runtime = createOutboxWorkerRuntime({
      inMemory: true,
      broker,
      mqttMode: "memory",
      mosEnv: "local",
      metrics,
    });

    const merchantId = "11111111-1111-4111-8111-111111111111";
    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId,
      storeId: "22222222-2222-4222-8222-222222222222",
      payload: { saleId: "sale-1", totalAmountMinor: "100000" },
    });
    await runtime.store.enqueue({
      envelope,
      aggregateId: "sale-1",
      aggregateType: "Sale",
    });

    const result = await runtime.dispatchOnce();
    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(broker.published.length).toBeGreaterThanOrEqual(1);
    const hit = broker.published.find((p) =>
      p.topic.includes(`/merchant/${merchantId}/sales`),
    );
    expect(hit?.topic).toBe(`mos/local/merchant/${merchantId}/sales`);
    expect(hit?.qos).toBe(1);
    const body = JSON.parse(hit!.payload) as { eventType: string };
    expect(body.eventType).toBe("SaleCompleted");
    expect(metrics.lagSamples.length).toBe(1);
    expect(metrics.published).toBe(1);
  });

  it("resumes after crash without losing unpublished outbox rows", async () => {
    const store = new InMemoryOutboxStore();
    const processed = new InMemoryProcessedSet();
    const broker = new InMemoryMqttBroker();
    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-1",
      storeId: "s-1",
      payload: { saleId: "sale-crash" },
    });
    const queued = await store.enqueue({ envelope });

    const failing = createOutboxWorker({
      store,
      processed,
      consumers: ["emqx_realtime"],
      handlers: {
        emqx_realtime: () => {
          throw new Error("crash_mid_publish");
        },
      },
    });
    await failing.dispatchOnce();
    expect((await store.getById(queued.id))?.publishedAt).toBeNull();
    expect(await store.pollPending(10)).toHaveLength(1);

    // New worker process after crash — same durable store.
    const recovered = createOutboxWorker({
      store,
      processed,
      consumers: ["emqx_realtime"],
      handlers: {
        emqx_realtime: createEmqxOutboxHandler({
          broker,
          env: "local",
        }),
      },
    });
    const result = await recovered.dispatchOnce();
    expect(result.published).toBe(1);
    expect(broker.published[0]?.topic).toContain("/sales");
    expect((await store.getById(queued.id))?.publishedAt).not.toBeNull();
  });

  it("auto-cancels unpaid orders after 30m with manipulated timestamps", async () => {
    let now = new Date("2026-08-03T10:00:00.000Z");
    const orders = new InMemoryOrderRepository();
    const ordering = createOrderingUseCases({
      orders,
      now: () => now,
    });
    await ordering.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "unpaid-adr109",
    });

    now = new Date("2026-08-03T10:30:00.000Z");
    const result = await runScheduledJob("pickup_unpaid_cancel", {
      ordering: {
        cancelUnpaidExpiredOrders: () => ordering.cancelUnpaidExpiredOrders(),
        expireReadyForPickupHolds: () => ordering.expireReadyForPickupHolds(),
      },
      now: () => now,
    });
    expect(result.status).toBe("completed");
    expect(result.affectedCount).toBe(1);
    expect(result.messageFa).toBe(
      OUTBOX_WORKER_UX_FA.JOB_PICKUP_UNPAID_CANCELLED,
    );
    expect(SCHEDULED_JOB_HOOKS.pickupUnpaidCancel.unpaidTimeoutMinutes).toBe(30);
  });

  it("expires ready_for_pickup after 24h to cancelled (staff refund remains)", async () => {
    let now = new Date("2026-08-03T10:00:00.000Z");
    const orders = new InMemoryOrderRepository();
    const ordering = createOrderingUseCases({
      orders,
      now: () => now,
    });
    const created = await ordering.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "ready-adr109",
    });
    await ordering.markPaid({ orderId: created.order.id });
    await ordering.startPreparing({ orderId: created.order.id });
    await ordering.markReadyForPickup({ orderId: created.order.id });

    now = new Date("2026-08-04T10:00:00.000Z");
    const result = await runScheduledJob("pickup_ready_hold_cancel", {
      ordering: {
        cancelUnpaidExpiredOrders: () => ordering.cancelUnpaidExpiredOrders(),
        expireReadyForPickupHolds: () => ordering.expireReadyForPickupHolds(),
      },
      now: () => now,
    });
    expect(result.status).toBe("completed");
    expect(result.affectedCount).toBe(1);
    expect(result.messageFa).toMatch(/[\u0600-\u06FF]/);
    const order = await ordering.getOrder({ orderId: created.order.id });
    expect(order.status).toBe("cancelled");
    expect(order.cancelReason).toBe("ready_hold_expired");
    expect(order.refundedAt).toBeNull();
  });

  it("loyalty expiry job enqueues PointsExpired", async () => {
    let now = new Date("2024-01-15T10:00:00.000Z");
    const wallets = new InMemoryWalletRepository();
    const rules = new InMemoryPointRuleRepository();
    const ledger = new InMemoryPointsLedgerRepository();
    const loyalty = createLoyaltyUseCases({
      wallets,
      rules,
      ledger,
      now: () => now,
    });
    await loyalty.earnPointsForSale({
      saleId: "sale-exp",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-exp",
      customerId: "cust-exp",
      totalAmountMinor: 100_000n,
    });
    now = addCalendarMonths(now, 12);

    const outbox = new InMemoryOutboxStore();
    const result = await runScheduledJob("loyalty_points_expiry", {
      runLoyaltyExpiry: async (input) => {
        const ran = await runLoyaltyPointsExpiryJob({
          loyalty,
          outbox,
          ...(input.now ? { now: input.now } : { now: () => now }),
        });
        return { expiredCount: ran.expiredCount };
      },
      now: () => now,
    });
    expect(result.status).toBe("completed");
    expect(result.affectedCount).toBe(1);
    const pending = await outbox.pollPending(10);
    expect(pending.some((m) => m.eventType === "PointsExpired")).toBe(true);
  });

  it("keeps Persian worker timeout copy and resolves mqtt mode", () => {
    expect(OUTBOX_WORKER_UX_FA.JOB_PICKUP_UNPAID_CANCELLED).toMatch(
      /[\u0600-\u06FF]/,
    );
    expect(OUTBOX_WORKER_UX_FA.JOB_PICKUP_READY_HOLD_EXPIRED).toMatch(
      /[\u0600-\u06FF]/,
    );
    expect(OUTBOX_WORKER_UX_FA.dir).toBe("rtl");
    expect(resolveMqttRuntimeMode({ MOS_MQTT_MODE: "memory" })).toBe("memory");
    expect(
      resolveMqttRuntimeMode({ MQTT_URL: "mqtt://localhost:1883" }),
    ).toBe("live");
  });

  it("records DLQ from runtime max-retry path", async () => {
    const deadLetter = new InMemoryDeadLetterStore();
    const runtime = createOutboxWorkerRuntime({
      inMemory: true,
      mqttMode: "memory",
      deadLetter,
      broker: {
        async publish() {
          throw new Error("emqx_unavailable");
        },
      },
    });
    // Override maxRetries via direct worker — runtime default is 5; use low-level.
    const store = runtime.store;
    const processed = runtime.processed;
    const worker = createOutboxWorker({
      store,
      processed,
      deadLetter,
      maxRetries: 1,
      consumers: ["emqx_realtime"],
      handlers: {
        emqx_realtime: () => {
          throw new Error("emqx_unavailable");
        },
      },
    });
    await store.enqueue({
      envelope: createEventEnvelope({
        eventType: "SaleCompleted",
        merchantId: "m-1",
        storeId: "s-1",
        payload: { saleId: "poison" },
      }),
    });
    const result = await worker.dispatchOnce();
    expect(result.deadLettered).toBe(1);
    expect(deadLetter.records).toHaveLength(1);
  });
});
