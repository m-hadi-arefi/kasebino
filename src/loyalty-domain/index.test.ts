import { describe, expect, it } from "vitest";

import {
  LOYALTY,
  LOYALTY_COPY_FA,
  LOYALTY_DECISION,
  LOYALTY_EVENTS,
  assertLoyaltyWalletScopedToMembership,
} from "./index.js";

describe("ADR-010 Loyalty domain contract", () => {
  it("scopes wallet to store membership with append-only ledger", () => {
    expect(LOYALTY_DECISION.walletScopedTo).toBe("store_membership");
    expect(LOYALTY_DECISION.ledgerAppendOnly).toBe(true);
    expect(LOYALTY_DECISION.noCrossStorePooling).toBe(true);
    expect(LOYALTY_DECISION.preventNegativeBalance).toBe(true);
    assertLoyaltyWalletScopedToMembership("store_membership");
    expect(() =>
      assertLoyaltyWalletScopedToMembership("global_customer"),
    ).toThrow(/store_membership/);
  });

  it("defaults expiry to 12 months after last earn (ADR-091)", () => {
    expect(LOYALTY_DECISION.expiry.defaultMonthsAfterLastEarn).toBe(12);
    expect(LOYALTY_DECISION.expiry.ledgerAppendOnly).toBe(true);
    expect(LOYALTY_DECISION.expiry.expiryEventName).toBe("PointsExpired");
    expect(LOYALTY_DECISION.expiry.canDisableExpiry).toBe(true);
  });

  it("names Points* events and Persian copy", () => {
    expect(LOYALTY_EVENTS).toEqual([
      "PointsEarned",
      "PointsRedeemed",
      "PointsExpired",
    ]);
    expect(LOYALTY.copyFa.pointsUnit).toBe("امتیاز");
    expect(LOYALTY_COPY_FA.walletLabel).toBe("کیف امتیاز");
    expect(LOYALTY_COPY_FA.expiryDefault).toMatch(/دوازده ماه/);
  });

  it("defers portal UI and expiry scheduler", () => {
    expect(LOYALTY_DECISION.customerPortalDeferredTo).toBe("ARD-035");
    expect(LOYALTY_DECISION.expireJobSchedulerDeferredTo).toBe("ADR-035");
  });
});
