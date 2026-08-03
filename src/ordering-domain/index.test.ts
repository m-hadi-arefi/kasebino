import { describe, expect, it } from "vitest";

import {
  FORBIDDEN_FULFILLMENT_MODES,
  ORDERING_DECISION,
  ORDER_EVENTS,
  ORDER_OUT_OF_MVP_EVENTS,
  ORDER_STATUS_LABELS_FA,
  ORDER_STATUSES,
  PICKUP_TIMER_POLICY,
  assertPickupOnlyFulfillment,
  orderStatusLabelFa,
} from "./index.js";

describe("ADR-011 ordering-domain contract", () => {
  it("locks pickup-only fulfillment and forbids delivery modes", () => {
    expect(ORDERING_DECISION.fulfillmentMode).toBe("pickup");
    expect(ORDERING_DECISION.noShippingTables).toBe(true);
    expect(FORBIDDEN_FULFILLMENT_MODES).toEqual(
      expect.arrayContaining(["delivery", "courier", "shipping"]),
    );
    expect(() => assertPickupOnlyFulfillment("pickup")).not.toThrow();
    expect(() => assertPickupOnlyFulfillment("delivery")).toThrow(/pickup-only/);
  });

  it("defines full pickup lifecycle statuses with Persian labels", () => {
    expect(ORDER_STATUSES).toEqual([
      "pending_payment",
      "paid",
      "preparing",
      "ready_for_pickup",
      "picked_up",
      "completed",
      "cancelled",
      "refunded",
    ]);
    expect(ORDER_STATUS_LABELS_FA.ready_for_pickup).toBe("آماده تحویل");
    expect(ORDER_STATUS_LABELS_FA.completed).toBe("تکمیل‌شده");
    expect(ORDER_STATUS_LABELS_FA.cancelled).toBe("لغو شده");
    expect(orderStatusLabelFa("preparing")).toBe("در حال آماده‌سازی");
  });

  it("binds ADR-091 unpaid 30m and ready-hold 24h timers without silent refund", () => {
    expect(PICKUP_TIMER_POLICY.unpaidPendingPaymentTimeoutMinutes).toBe(30);
    expect(PICKUP_TIMER_POLICY.readyForPickupHoldHours).toBe(24);
    expect(PICKUP_TIMER_POLICY.noShowSilentRefund).toBe(false);
    expect(ORDERING_DECISION.timers).toBe(PICKUP_TIMER_POLICY);
  });

  it("lists pickup events and marks OrderDelivered out of MVP", () => {
    expect(ORDER_EVENTS).toContain("OrderReadyForPickup");
    expect(ORDER_EVENTS).toContain("OrderPickedUp");
    expect(ORDER_EVENTS).not.toContain("OrderDelivered");
    expect(ORDER_OUT_OF_MVP_EVENTS).toContain("OrderDelivered");
  });
});
