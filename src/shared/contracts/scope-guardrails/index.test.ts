import { describe, expect, it } from "vitest";
import { FORBIDDEN_CAPABILITIES } from "../../architecture/product/index.js";
import {
  MVP_IN_SCOPE_PRIORITIES,
  MVP_NON_GOALS,
  SCOPE_GUARDRAILS,
  assertWithinMvpScope,
  isMvpNonGoal,
} from "./index.js";

describe("ADR-015 scope guardrails", () => {
  it("classifies PRD §3 / ADR-015 hard non-goals", () => {
    const required = [
      "delivery",
      "courier",
      "shipping",
      "rider_fleet",
      "marketplace_browse",
      "full_accounting",
      "supplier_network",
      "desktop_offline_suite",
      "multi_warehouse_erp",
      "advanced_ai_recommendations",
    ] as const;

    for (const goal of required) {
      expect(isMvpNonGoal(goal)).toBe(true);
      expect(MVP_NON_GOALS).toContain(goal);
    }
  });

  it("stays aligned with ADR-001 forbidden capabilities", () => {
    expect(MVP_NON_GOALS).toEqual(FORBIDDEN_CAPABILITIES);
  });

  it("rejects non-goals via assertWithinMvpScope", () => {
    expect(() => assertWithinMvpScope("delivery")).toThrow(/ADR-015/);
    expect(() => assertWithinMvpScope("marketplace_browse")).toThrow(/superseding/i);
    expect(() => assertWithinMvpScope("desktop_offline_suite")).toThrow(/scope guardrails/i);
    expect(() => assertWithinMvpScope("pos_checkout")).not.toThrow();
  });

  it("protects Iranian MVP in-scope priorities", () => {
    expect(MVP_IN_SCOPE_PRIORITIES).toEqual(
      expect.arrayContaining([
        "pos_phone_capture",
        "sms_otp",
        "qr_acquisition",
        "pickup_order",
        "store_pwa",
      ]),
    );
    expect(SCOPE_GUARDRAILS.retentionLoops).toEqual(
      expect.arrayContaining(["pos_phone_capture", "pickup_order"]),
    );
  });
});
