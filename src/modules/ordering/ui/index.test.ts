import { describe, expect, it } from "vitest";

import { PICKUP_TIMER_POLICY } from "../../../shared/contracts/mvp-policies/index.js";
import { assertUiuxGate } from "../../../shared/contracts/uiuxpromax-gate/index.js";
import {
  BOARD_POLL_INTERVAL_MS,
  ORDERS_UI_COPY_FA,
  canCancelOrder,
  canRefundOrder,
  filterOrdersByStatus,
  formatOrdersJalali,
  formatOrdersToman,
  primaryActionForStatus,
  readyHoldSignal,
  statusLabelFa,
  type OrderDto,
} from "./index.js";

function sampleOrder(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: "ord-1",
    merchantId: "m1",
    storeId: "s1",
    membershipId: null,
    customerId: null,
    status: "paid",
    fulfillmentMode: "pickup",
    totalAmountMinor: "500000",
    totalDisplayToman: "۵۰٬۰۰۰ تومان",
    idempotencyKey: "idem-1",
    lines: [
      {
        id: "l1",
        productId: "p1",
        productName: "نان سنگک",
        quantity: 2,
        unitPriceMinor: "250000",
        lineDisplayToman: "۲۵٬۰۰۰ تومان",
      },
    ],
    pendingPaymentAt: "2026-08-05T08:00:00.000Z",
    paidAt: "2026-08-05T08:05:00.000Z",
    preparingAt: null,
    readyForPickupAt: null,
    pickedUpAt: null,
    completedAt: null,
    cancelledAt: null,
    refundedAt: null,
    cancelReason: null,
    createdAt: "2026-08-05T08:00:00.000Z",
    updatedAt: "2026-08-05T08:05:00.000Z",
    ...overrides,
  };
}

describe("ADR-101 pickup order merchant board UI", () => {
  it("passes uiuxpromax Persian+RTL brief gate for orders board", () => {
    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: true,
        docsPresent: true,
        uiInScope: true,
        brief: {
          persian: true,
          rtl: true,
          faIrPersona: true,
          mobile390: true,
          iranianRetailContext: true,
          screenListDocumented: true,
          statesDocumented: true,
          a11yNotes: true,
        },
      }),
    ).not.toThrow();
    expect(ORDERS_UI_COPY_FA.boardTitle).toMatch(/سفارش/);
    expect(ORDERS_UI_COPY_FA.fulfillmentHint).toMatch(/حضوری/);
    expect(ORDERS_UI_COPY_FA.empty).toMatch(/[\u0600-\u06FF]/);
    expect(ORDERS_UI_COPY_FA.actionReady).toMatch(/آماده/);
    expect(ORDERS_UI_COPY_FA.actionRefund).toMatch(/بازپرداخت/);
    expect(formatOrdersToman(100_000)).toMatch(/تومان/);
    expect(statusLabelFa("ready_for_pickup")).toBe("آماده تحویل");
    expect(formatOrdersJalali("2026-08-05T09:00:00.000Z")).toMatch(
      /[\u06F0-\u06F9\d]/,
    );
    expect(BOARD_POLL_INTERVAL_MS).toBe(15_000);
    expect(PICKUP_TIMER_POLICY.readyForPickupHoldHours).toBe(24);
  });

  it("maps happy-path primary actions and cancel/refund policy", () => {
    expect(primaryActionForStatus("paid")?.action).toBe("preparing");
    expect(primaryActionForStatus("preparing")?.action).toBe("ready");
    expect(primaryActionForStatus("ready_for_pickup")?.action).toBe(
      "picked-up",
    );
    expect(primaryActionForStatus("picked_up")?.action).toBe("complete");
    expect(primaryActionForStatus("completed")).toBeNull();
    expect(canCancelOrder("paid")).toBe(true);
    expect(canCancelOrder("completed")).toBe(false);
    expect(canRefundOrder("cancelled", "2026-08-05T08:05:00.000Z")).toBe(true);
    expect(canRefundOrder("cancelled", null)).toBe(false);
  });

  it("signals ready-hold urgency and filters open statuses", () => {
    const readyAt = new Date("2026-08-05T00:00:00.000Z");
    const order = sampleOrder({
      status: "ready_for_pickup",
      readyForPickupAt: readyAt.toISOString(),
    });
    expect(readyHoldSignal(order, new Date("2026-08-05T10:00:00.000Z"))).toBe(
      "ok",
    );
    expect(readyHoldSignal(order, new Date("2026-08-05T21:00:00.000Z"))).toBe(
      "urgent",
    );
    expect(readyHoldSignal(order, new Date("2026-08-06T01:00:00.000Z"))).toBe(
      "expired",
    );

    const list = [
      sampleOrder({ id: "1", status: "paid" }),
      sampleOrder({ id: "2", status: "completed" }),
      sampleOrder({ id: "3", status: "ready_for_pickup" }),
    ];
    expect(filterOrdersByStatus(list, "open").map((o) => o.id)).toEqual([
      "1",
      "3",
    ]);
    expect(filterOrdersByStatus(list, "paid").map((o) => o.id)).toEqual(["1"]);
  });

  it("never advertises delivery on the board copy", () => {
    const blob = Object.values(ORDERS_UI_COPY_FA).join(" ");
    expect(blob).not.toMatch(/ارسال|delivery|courier|shipping/i);
    expect(blob).toMatch(/پیکاپ|حضوری/);
  });
});
