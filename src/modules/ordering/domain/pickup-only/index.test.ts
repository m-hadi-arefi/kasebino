import { describe, expect, it } from "vitest";
import {
  ALLOWED_FULFILLMENT_MODES,
  FORBIDDEN_CAPABILITIES,
} from "../../../../shared/architecture/product/index.js";
import {
  FORBIDDEN_FULFILLMENT_MODES,
  ORDER_FULFILLMENT_MODES,
} from "../contracts/index.js";
import { FORBIDDEN_URL_SEGMENTS } from "../../../../shared/contracts/app-router-structure/index.js";
import { PICKUP_TIMER_POLICY } from "../../../../shared/contracts/mvp-policies/index.js";
import {
  FORBIDDEN_FULFILLMENT_CAPABILITIES,
  FORBIDDEN_FULFILLMENT_URL_SEGMENTS,
  PICKUP_ONLY,
  PICKUP_ONLY_COPY_FA,
  PICKUP_ONLY_DECISION,
  PICKUP_ONLY_FULFILLMENT,
  PICKUP_ONLY_TIMERS,
  assertNoDeliveryAnywhere,
  assertPickupOnlyCapability,
  assertPickupOnlyFulfillment,
  assertPickupOnlyRoute,
  assertPickupOnlyRouteSegment,
  isForbiddenFulfillmentCapability,
  isPickupOnlyFulfillmentMode,
} from "./index.js";

describe("ADR-082 pickup-only fulfillment", () => {
  it("locks Order.fulfillmentType to pickup only", () => {
    expect(PICKUP_ONLY_FULFILLMENT).toBe("pickup");
    expect(PICKUP_ONLY_DECISION.fulfillmentType).toBe("pickup");
    expect(PICKUP_ONLY_DECISION.allowedModes).toEqual(["pickup"]);
    expect(PICKUP_ONLY_DECISION.defaultMode).toBe("pickup");
    expect(PICKUP_ONLY_DECISION.shippingTables).toBe(false);
    expect(PICKUP_ONLY_DECISION.deliveryUi).toBe(false);
    expect(PICKUP_ONLY_DECISION.analyticsFunnel).toBe("pickup_only");
    expect(isPickupOnlyFulfillmentMode("pickup")).toBe(true);
    expect(isPickupOnlyFulfillmentMode("delivery")).toBe(false);
  });

  it("aligns product-architecture and ordering fulfillment modes", () => {
    expect(ALLOWED_FULFILLMENT_MODES).toEqual(ORDER_FULFILLMENT_MODES);
    expect([...FORBIDDEN_FULFILLMENT_MODES]).toEqual(
      expect.arrayContaining(["delivery", "courier", "shipping"]),
    );
    for (const mode of FORBIDDEN_FULFILLMENT_MODES) {
      expect(FORBIDDEN_CAPABILITIES).toEqual(
        expect.arrayContaining([
          mode === "courier" ? "courier" : mode === "shipping" ? "shipping" : "delivery",
        ]),
      );
    }
    expect(PICKUP_ONLY.orderingForbiddenModes).toEqual(FORBIDDEN_FULFILLMENT_MODES);
  });

  it("rejects non-pickup fulfillment modes", () => {
    expect(() => assertPickupOnlyFulfillment("pickup")).not.toThrow();
    expect(() => assertPickupOnlyFulfillment("delivery")).toThrow(/ADR-082/);
    expect(() => assertPickupOnlyFulfillment("courier")).toThrow(/pickup-only/);
    expect(() => assertPickupOnlyFulfillment("shipping")).toThrow(/superseding/i);
  });

  it("rejects forbidden fulfillment capabilities", () => {
    for (const capability of FORBIDDEN_FULFILLMENT_CAPABILITIES) {
      expect(isForbiddenFulfillmentCapability(capability)).toBe(true);
      expect(() => assertPickupOnlyCapability(capability)).toThrow(/ADR-082/);
    }
    expect(() => assertPickupOnlyCapability("rider_fleet")).toThrow(/forbidden/);
    expect(() => assertPickupOnlyCapability("pickup_order")).not.toThrow();
    expect(() => assertPickupOnlyCapability("marketplace_browse")).toThrow(/ADR-082/);
  });

  it("rejects forbidden delivery routes and URL segments", () => {
    expect(FORBIDDEN_FULFILLMENT_URL_SEGMENTS).toEqual(FORBIDDEN_URL_SEGMENTS);
    for (const segment of ["delivery", "courier", "shipping", "rider"] as const) {
      expect(() => assertPickupOnlyRouteSegment(segment)).toThrow(/ADR-082/);
    }
    expect(() => assertPickupOnlyRoute("/api/v1/orders/deliver")).toThrow(/ADR-082/);
    expect(() => assertPickupOnlyRoute("/api/v1/orders/delivery")).toThrow(/delivery/);
    expect(() => assertPickupOnlyRoute("merchant/shipping/track")).toThrow(/shipping/);
    expect(() => assertPickupOnlyRoute("/s/my-store/pickup")).not.toThrow();
    expect(() => assertPickupOnlyRoute("api/v1/orders/ready")).not.toThrow();
    expect(() => assertPickupOnlyRouteSegment("deliver")).toThrow(/ADR-082/);
  });

  it("assertNoDeliveryAnywhere covers capability, route, and mode", () => {
    expect(() => assertNoDeliveryAnywhere("delivery")).toThrow(/ADR-082/);
    expect(() => assertNoDeliveryAnywhere("courier")).toThrow(/ADR-082/);
    expect(() => assertNoDeliveryAnywhere("/courier/dispatch")).toThrow(/ADR-082/);
    expect(() => assertNoDeliveryAnywhere("shipping")).toThrow(/ADR-082/);
    expect(() => assertNoDeliveryAnywhere("pickup")).not.toThrow();
  });

  it("restates ADR-091 unpaid 30m and ready-hold 24h timers", () => {
    expect(PICKUP_ONLY_TIMERS.unpaidPendingPaymentTimeoutMinutes).toBe(30);
    expect(PICKUP_ONLY_TIMERS.readyForPickupHoldHours).toBe(24);
    expect(PICKUP_ONLY_TIMERS.noShowSilentRefund).toBe(false);
    expect(PICKUP_ONLY_TIMERS).toMatchObject({
      unpaidPendingPaymentTimeoutMinutes:
        PICKUP_TIMER_POLICY.unpaidPendingPaymentTimeoutMinutes,
      readyForPickupHoldHours: PICKUP_TIMER_POLICY.readyForPickupHoldHours,
      noShowSilentRefund: PICKUP_TIMER_POLICY.noShowSilentRefund,
    });
  });

  it("exposes Persian pickup statuses and instructions", () => {
    expect(PICKUP_ONLY_COPY_FA.readyForPickup).toBe("آماده تحویل");
    expect(PICKUP_ONLY_COPY_FA.completed).toBe("تکمیل‌شده");
    expect(PICKUP_ONLY_COPY_FA.cancelled).toBe("لغو شده");
    expect(PICKUP_ONLY_COPY_FA.fulfillmentPickupOnly).toBe(
      "فقط دریافت حضوری از فروشگاه",
    );
    expect(PICKUP_ONLY_COPY_FA.navigateToStore).toMatch(/فروشگاه/);
    expect(PICKUP_ONLY.statusLabelsFa.ready_for_pickup).toBe("آماده تحویل");
  });
});
