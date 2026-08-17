import { describe, expect, it } from "vitest";

import {
  CRM_MEMBERSHIP,
  CRM_MEMBERSHIP_DECISION,
  DIGITAL_CONSENT_CHECKBOX_LABEL_FA,
  MEMBERSHIP_SOURCES,
  POS_PHONE_CONSENT_NOTICE_FA,
  assertMembershipSource,
  isDigitalMembershipSource,
} from "./index.js";

describe("ADR-007 CRM Membership contract", () => {
  it("locks store-scoped membership and identity separation", () => {
    expect(CRM_MEMBERSHIP_DECISION.aggregate).toBe("StoreMembership");
    expect(CRM_MEMBERSHIP_DECISION.module).toBe("crm");
    expect(CRM_MEMBERSHIP_DECISION.storeScoped).toBe(true);
    expect(CRM_MEMBERSHIP_DECISION.walletsScopedTo).toBe("membership");
    expect(
      CRM_MEMBERSHIP_DECISION.customerIdentitySeparateFromMerchantAuth,
    ).toBe(true);
    expect(CRM_MEMBERSHIP_DECISION.uniqueKey).toBe("store_id_phone_active");
    expect(MEMBERSHIP_SOURCES).toEqual(
      expect.arrayContaining(["pos", "qr", "storefront", "pickup"]),
    );
  });

  it("codifies ADR-091 POS notice-continue vs digital checkbox", () => {
    expect(CRM_MEMBERSHIP_DECISION.consent.pos.pattern).toBe(
      "notice_continue_equals_consent",
    );
    expect(CRM_MEMBERSHIP_DECISION.consent.pos.mandatoryCheckbox).toBe(false);
    expect(
      CRM_MEMBERSHIP_DECISION.consent.customerDigital.mandatoryCheckbox,
    ).toBe(true);
    expect(POS_PHONE_CONSENT_NOTICE_FA).toMatch(/[\u0600-\u06FF]/);
    expect(DIGITAL_CONSENT_CHECKBOX_LABEL_FA).toMatch(/[\u0600-\u06FF]/);
    expect(CRM_MEMBERSHIP.posNoticeFa).toBe(POS_PHONE_CONSENT_NOTICE_FA);
  });

  it("classifies digital join sources", () => {
    expect(isDigitalMembershipSource("pos")).toBe(false);
    expect(isDigitalMembershipSource("qr")).toBe(true);
    expect(isDigitalMembershipSource("storefront")).toBe(true);
    expect(isDigitalMembershipSource("pickup")).toBe(true);
    expect(() => assertMembershipSource("pos")).not.toThrow();
    expect(() => assertMembershipSource("email")).toThrow(/Invalid membership source/);
  });
});
