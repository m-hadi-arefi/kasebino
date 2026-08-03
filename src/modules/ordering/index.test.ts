import { describe, expect, it, vi } from "vitest";

import {
  ORDERING_ERROR_MESSAGES_FA,
  ORDER_STATUS_LABELS_FA,
  OrderingDomainError,
  createOrderingUseCases,
  createStubInventoryReleasePort,
  createStubInventoryReservePort,
  createStubPaymentConfirmPort,
  InMemoryOrderRepository,
  orderStatusLabelFa,
  type InventoryReleasePort,
  type InventoryReservePort,
  type PaymentConfirmPort,
} from "./index.js";

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

function createOrderingHarness(opts?: {
  now?: () => Date;
  inventoryReserve?: InventoryReservePort;
  inventoryRelease?: InventoryReleasePort;
  paymentConfirm?: PaymentConfirmPort;
}) {
  const orders = new InMemoryOrderRepository();
  let seq = 0;
  const useCases = createOrderingUseCases({
    orders,
    ...(opts?.now ? { now: opts.now } : {}),
    ...(opts?.inventoryReserve
      ? { inventoryReserve: opts.inventoryReserve }
      : {}),
    ...(opts?.inventoryRelease
      ? { inventoryRelease: opts.inventoryRelease }
      : {}),
    ...(opts?.paymentConfirm ? { paymentConfirm: opts.paymentConfirm } : {}),
    idFactory: () => `ord-${++seq}`,
  });
  return { orders, useCases };
}

async function createPaidReadyPath(
  useCases: ReturnType<typeof createOrderingUseCases>,
  key = "idem-happy",
) {
  const created = await useCases.createOrder({
    merchantId: "m1",
    storeId: "s1",
    membershipId: "mem-1",
    customerId: "cust-1",
    lines: sampleLines(),
    idempotencyKey: key,
  });
  await useCases.markPaid({ orderId: created.order.id });
  await useCases.startPreparing({ orderId: created.order.id });
  await useCases.markReadyForPickup({ orderId: created.order.id });
  return created.order.id;
}

describe("ADR-011 Ordering module", () => {
  it("creates pending_payment pickup order with OrderCreated and Persian status label", async () => {
    const { useCases } = createOrderingHarness();

    const result = await useCases.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "idem-1",
    });

    expect(result.created).toBe(true);
    expect(result.order.status).toBe("pending_payment");
    expect(result.order.fulfillmentMode).toBe("pickup");
    expect(result.order.totalAmountMinor).toBe(100_000n);
    expect(result.event?.eventName).toBe("OrderCreated");
    expect(orderStatusLabelFa(result.order.status)).toBe("در انتظار پرداخت");
    expect(ORDER_STATUS_LABELS_FA.ready_for_pickup).toBe("آماده تحویل");
  });

  it("is idempotent for the same merchant idempotency key", async () => {
    const { useCases } = createOrderingHarness();
    const input = {
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "same-key",
    };

    const first = await useCases.createOrder(input);
    const second = await useCases.createOrder(input);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.order.id).toBe(first.order.id);
    expect(second.event).toBeNull();
  });

  it("runs full pickup happy path to completed with domain events", async () => {
    const { useCases } = createOrderingHarness();
    const created = await useCases.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "happy",
    });
    const id = created.order.id;

    const paid = await useCases.markPaid({ orderId: id });
    expect(paid.order.status).toBe("paid");
    expect(paid.event.eventName).toBe("OrderPaid");

    const preparing = await useCases.startPreparing({ orderId: id });
    expect(preparing.order.status).toBe("preparing");
    expect(preparing.event.eventName).toBe("OrderPreparing");

    const ready = await useCases.markReadyForPickup({ orderId: id });
    expect(ready.order.status).toBe("ready_for_pickup");
    expect(ready.event.eventName).toBe("OrderReadyForPickup");
    expect(orderStatusLabelFa(ready.order.status)).toBe("آماده تحویل");

    const picked = await useCases.markPickedUp({ orderId: id });
    expect(picked.order.status).toBe("picked_up");
    expect(picked.event.eventName).toBe("OrderPickedUp");

    const completed = await useCases.completeOrder({ orderId: id });
    expect(completed.order.status).toBe("completed");
    expect(completed.event.eventName).toBe("OrderCompleted");
    expect(orderStatusLabelFa(completed.order.status)).toBe("تکمیل‌شده");
  });

  it("rejects delivery fulfillment with Persian error", async () => {
    const { useCases } = createOrderingHarness();

    await expect(
      useCases.createOrder({
        merchantId: "m1",
        storeId: "s1",
        lines: sampleLines(),
        idempotencyKey: "del",
        fulfillmentMode: "delivery",
      }),
    ).rejects.toMatchObject({
      code: "DELIVERY_FORBIDDEN",
      messageFa: ORDERING_ERROR_MESSAGES_FA.DELIVERY_FORBIDDEN,
    });
  });

  it("rejects illegal status transitions with Persian error", async () => {
    const { useCases } = createOrderingHarness();
    const created = await useCases.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "bad-tx",
    });

    await expect(
      useCases.startPreparing({ orderId: created.order.id }),
    ).rejects.toBeInstanceOf(OrderingDomainError);

    await expect(
      useCases.startPreparing({ orderId: created.order.id }),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
      messageFa: ORDERING_ERROR_MESSAGES_FA.INVALID_TRANSITION,
    });
  });

  it("calls payment confirm + inventory reserve stubs on markPaid", async () => {
    const reserve = vi.fn(
      createStubInventoryReservePort().reserveForOrder.bind(
        createStubInventoryReservePort(),
      ),
    );
    const confirm = vi.fn(async (input: {
      orderId: string;
      merchantId: string;
      storeId: string;
      amountMinor: bigint;
      paymentReference?: string;
    }) => ({ confirmed: true, paymentId: `pay-${input.orderId}` }));

    const inventoryReserve: InventoryReservePort = {
      reserveForOrder: reserve,
    };
    const paymentConfirm: PaymentConfirmPort = {
      confirmOrderPayment: confirm,
    };

    const { useCases } = createOrderingHarness({
      inventoryReserve,
      paymentConfirm,
    });
    const created = await useCases.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "ports",
    });

    await useCases.markPaid({
      orderId: created.order.id,
      paymentReference: "ref-1",
    });

    expect(confirm).toHaveBeenCalledOnce();
    expect(reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: created.order.id,
        sameTransaction: true,
        lines: [{ productId: "prod-1", quantity: 2 }],
      }),
    );
  });

  it("auto-cancels unpaid orders after 30 minutes (ADR-091)", async () => {
    let now = new Date("2026-08-03T10:00:00.000Z");
    const { useCases } = createOrderingHarness({ now: () => now });

    const created = await useCases.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "unpaid-timer",
    });

    now = new Date("2026-08-03T10:29:00.000Z");
    const early = await useCases.cancelUnpaidExpiredOrders();
    expect(early.cancelledCount).toBe(0);

    now = new Date("2026-08-03T10:30:00.000Z");
    const expired = await useCases.cancelUnpaidExpiredOrders();
    expect(expired.cancelledCount).toBe(1);
    expect(expired.orders[0]?.id).toBe(created.order.id);
    expect(expired.orders[0]?.status).toBe("cancelled");
    expect(expired.orders[0]?.cancelReason).toBe("unpaid_timeout");
  });

  it("expires ready_for_pickup after 24h to cancelled without silent refund", async () => {
    let now = new Date("2026-08-03T10:00:00.000Z");
    const release = vi.fn(
      createStubInventoryReleasePort().releaseForOrder.bind(
        createStubInventoryReleasePort(),
      ),
    );
    const { useCases } = createOrderingHarness({
      now: () => now,
      inventoryRelease: { releaseForOrder: release },
    });

    const orderId = await createPaidReadyPath(useCases, "ready-hold");

    now = new Date("2026-08-04T09:00:00.000Z");
    const early = await useCases.expireReadyForPickupHolds();
    expect(early.expiredCount).toBe(0);

    now = new Date("2026-08-04T10:00:00.000Z");
    const expired = await useCases.expireReadyForPickupHolds();
    expect(expired.expiredCount).toBe(1);
    expect(expired.orders[0]?.status).toBe("cancelled");
    expect(expired.orders[0]?.cancelReason).toBe("ready_hold_expired");
    expect(release).toHaveBeenCalled();

    const order = await useCases.getOrder({ orderId });
    expect(order.status).toBe("cancelled");
    expect(order.refundedAt).toBeNull();
  });

  it("refunds only explicitly after payment; unpaid cancel cannot refund", async () => {
    const { useCases } = createOrderingHarness();
    const unpaid = await useCases.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "no-refund",
    });
    await useCases.cancelOrder({ orderId: unpaid.order.id, reason: "customer" });

    await expect(
      useCases.refundOrder({ orderId: unpaid.order.id }),
    ).rejects.toMatchObject({ code: "REFUND_REQUIRES_PAYMENT" });

    const paid = await useCases.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: sampleLines(),
      idempotencyKey: "refund-ok",
    });
    await useCases.markPaid({ orderId: paid.order.id });
    const refunded = await useCases.refundOrder({ orderId: paid.order.id });
    expect(refunded.order.status).toBe("refunded");
    expect(refunded.event.eventName).toBe("OrderRefunded");
  });

  it("cancels from ready_for_pickup and lists open store orders", async () => {
    const { useCases } = createOrderingHarness();
    const orderId = await createPaidReadyPath(useCases, "cancel-ready");

    const cancelled = await useCases.cancelOrder({
      orderId,
      reason: "no_show",
    });
    expect(cancelled.order.status).toBe("cancelled");
    expect(cancelled.event.eventName).toBe("OrderCanceled");
    expect(orderStatusLabelFa(cancelled.order.status)).toBe("لغو شده");

    const open = await useCases.listStoreOrders({
      merchantId: "m1",
      storeId: "s1",
      status: "ready_for_pickup",
    });
    expect(open).toHaveLength(0);
  });

  it("exposes stub payment/inventory factories", () => {
    expect(createStubPaymentConfirmPort()).toBeDefined();
    expect(createStubInventoryReservePort()).toBeDefined();
    expect(createStubInventoryReleasePort()).toBeDefined();
  });
});
