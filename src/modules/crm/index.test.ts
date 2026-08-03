import { describe, expect, it } from "vitest";

import {
  CRM_MEMBERSHIP_DECISION,
  POS_PHONE_CONSENT_NOTICE_FA,
} from "../../crm-membership/index.js";
import {
  CRM_ERROR_MESSAGES_FA,
  CrmDomainError,
  InMemoryStoreMembershipRepository,
  createCrmUseCases,
} from "./index.js";

function createHarness() {
  const memberships = new InMemoryStoreMembershipRepository();
  let n = 0;
  const useCases = createCrmUseCases({
    memberships,
    idFactory: () => `id-${++n}`,
    now: (() => {
      let t = 1_700_000_000_000;
      return () => new Date(t++);
    })(),
  });
  return { memberships, useCases };
}

describe("ADR-007 Customer Membership Model", () => {
  it("contract: store-scoped + POS notice-continue consent", () => {
    expect(CRM_MEMBERSHIP_DECISION.storeScoped).toBe(true);
    expect(CRM_MEMBERSHIP_DECISION.uniqueKey).toBe("store_id_phone_active");
    expect(CRM_MEMBERSHIP_DECISION.consent.pos.mandatoryCheckbox).toBe(false);
    expect(POS_PHONE_CONSENT_NOTICE_FA).toMatch(/[\u0600-\u06FF]/);
  });

  it("POS phone capture upserts membership with notice-continue consent", async () => {
    const { useCases, memberships } = createHarness();
    const result = await useCases.upsertFromPosPhoneCapture({
      merchantId: "merchant-1",
      storeId: "store-1",
      phone: "09123456789",
    });

    expect(result.created).toBe(true);
    expect(result.membership.source).toBe("pos");
    expect(result.membership.phoneNational).toBe("09123456789");
    expect(result.membership.phoneE164).toBe("+989123456789");
    expect(result.membership.merchantId).toBe("merchant-1");
    expect(result.membership.storeId).toBe("store-1");
    expect(result.membership.status).toBe("active");
    expect(result.membership.consent.surface).toBe("pos_notice_continue");
    expect(result.membership.consent.version).toBe(
      CRM_MEMBERSHIP_DECISION.consent.defaultNoticeVersion,
    );
    expect(result.consentNoticeFa).toBe(POS_PHONE_CONSENT_NOTICE_FA);
    expect(result.event.eventName).toBe("MembershipCreated");
    if (result.created) {
      expect(result.event.payload.source).toBe("pos");
      expect(result.event.payload.consentSurface).toBe("pos_notice_continue");
    }

    const listed = await memberships.listByStoreId("store-1", {
      merchantId: "merchant-1",
    });
    expect(listed).toHaveLength(1);
  });

  it("re-capture same phone same store upserts without duplicate", async () => {
    const { useCases, memberships } = createHarness();
    const first = await useCases.upsertFromPosPhoneCapture({
      merchantId: "m1",
      storeId: "s1",
      phone: "+989123456789",
    });
    const second = await useCases.upsertFromPosPhoneCapture({
      merchantId: "m1",
      storeId: "s1",
      phone: "09123456789",
      consentNoticeVersion: "pos-consent-v2",
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.membership.id).toBe(first.membership.id);
    expect(second.membership.source).toBe("pos");
    expect(second.membership.consent.version).toBe("pos-consent-v2");
    expect(second.event.eventName).toBe("MembershipUpdated");
    if (!second.created) {
      expect(second.event.payload.changedFields).toContain("consent");
    }

    const listed = await memberships.listByStoreId("s1");
    expect(listed).toHaveLength(1);
  });

  it("same phone different stores creates separate memberships", async () => {
    const { useCases } = createHarness();
    const a = await useCases.upsertFromPosPhoneCapture({
      merchantId: "m1",
      storeId: "store-a",
      phone: "09120000001",
    });
    const b = await useCases.upsertFromPosPhoneCapture({
      merchantId: "m1",
      storeId: "store-b",
      phone: "09120000001",
    });

    expect(a.membership.id).not.toBe(b.membership.id);
    expect(a.membership.storeId).toBe("store-a");
    expect(b.membership.storeId).toBe("store-b");
    expect(a.membership.customerId).toBe(b.membership.customerId);
  });

  it("digital join requires explicit consent checkbox", async () => {
    const { useCases } = createHarness();

    await expect(
      useCases.joinWithDigitalConsent({
        merchantId: "m1",
        storeId: "s1",
        phone: "09121112233",
        source: "storefront",
        consentCheckboxAccepted: false,
      }),
    ).rejects.toMatchObject({
      code: "CONSENT_REQUIRED",
      messageFa: CRM_ERROR_MESSAGES_FA.CONSENT_REQUIRED,
    });

    const { membership, created, event, consentCheckboxLabelFa } =
      await useCases.joinWithDigitalConsent({
        merchantId: "m1",
        storeId: "s1",
        phone: "09121112233",
        source: "qr",
        consentCheckboxAccepted: true,
      });

    expect(created).toBe(true);
    expect(membership.source).toBe("qr");
    expect(membership.consent.surface).toBe("digital_checkbox");
    expect(event.eventName).toBe("MembershipCreated");
    expect(consentCheckboxLabelFa).toMatch(/[\u0600-\u06FF]/);
  });

  it("rejects invalid Iranian phone with Persian error", async () => {
    const { useCases } = createHarness();

    await expect(
      useCases.upsertFromPosPhoneCapture({
        merchantId: "m1",
        storeId: "s1",
        phone: "12345",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_PHONE",
      messageFa: CRM_ERROR_MESSAGES_FA.INVALID_PHONE,
    });

    expect(CRM_ERROR_MESSAGES_FA.INVALID_PHONE).toMatch(/[\u0600-\u06FF]/);
    expect(new CrmDomainError("CONSENT_REQUIRED").messageFa).toMatch(
      /[\u0600-\u06FF]/,
    );
  });

  it("soft-delete hides membership from default store list", async () => {
    const { useCases, memberships } = createHarness();
    const { membership } = await useCases.upsertFromPosPhoneCapture({
      merchantId: "m1",
      storeId: "s1",
      phone: "09123334455",
    });

    const { event } = await useCases.softDeleteMembership({
      membershipId: membership.id,
    });

    expect(event.eventName).toBe("MembershipUpdated");
    expect(membership.deletedAt).not.toBeNull();
    expect(membership.status).toBe("inactive");

    const active = await memberships.listByStoreId("s1");
    expect(active).toHaveLength(0);

    const all = await memberships.listByStoreId("s1", { includeDeleted: true });
    expect(all).toHaveLength(1);

    const found = await memberships.findByStoreAndPhone("s1", "09123334455");
    expect(found).toBeNull();
  });

  it("tenant filter: listByStore with merchantId excludes other merchants", async () => {
    const { useCases, memberships } = createHarness();
    await useCases.upsertFromPosPhoneCapture({
      merchantId: "merchant-a",
      storeId: "shared-looking-store",
      phone: "09125556677",
    });

    const wrongTenant = await memberships.listByStoreId("shared-looking-store", {
      merchantId: "merchant-b",
    });
    expect(wrongTenant).toHaveLength(0);

    const rightTenant = await memberships.listByStoreId("shared-looking-store", {
      merchantId: "merchant-a",
    });
    expect(rightTenant).toHaveLength(1);
  });
});
