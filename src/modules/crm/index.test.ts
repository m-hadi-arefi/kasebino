import { describe, expect, it } from "vitest";

import {
  CRM_MEMBERSHIP_DECISION,
  POS_PHONE_CONSENT_NOTICE_FA,
} from "./domain/membership/index.js";
import {
  CRM_ERROR_MESSAGES_FA,
  CrmDomainError,
  InMemoryStoreMembershipRepository,
  createCrmUseCases,
} from "./index.js";
import { InMemorySaleRepository } from "../pos/infrastructure/index.js";

function createHarness() {
  const memberships = new InMemoryStoreMembershipRepository();
  const sales = new InMemorySaleRepository();
  let n = 0;
  const useCases = createCrmUseCases({
    memberships,
    sales,
    idFactory: () => `id-${++n}`,
    now: (() => {
      let t = 1_700_000_000_000;
      return () => new Date(t++);
    })(),
  });
  return { memberships, sales, useCases };
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

describe("ADR-098 CRM segments + profile history", () => {
  it("assigns new / returning / lapsed exclusively from completed sales", async () => {
    const memberships = new InMemoryStoreMembershipRepository();
    const sales = new InMemorySaleRepository();
    const now = new Date("2026-08-05T12:00:00.000Z");
    const useCases = createCrmUseCases({
      memberships,
      sales,
      idFactory: (() => {
        let n = 0;
        return () => `crm-${++n}`;
      })(),
      now: () => now,
    });

    const fresh = await useCases.upsertFromPosPhoneCapture({
      merchantId: "m1",
      storeId: "s1",
      phone: "09121111111",
    });
    const returner = await useCases.upsertFromPosPhoneCapture({
      merchantId: "m1",
      storeId: "s1",
      phone: "09122222222",
    });
    const lapsed = await useCases.upsertFromPosPhoneCapture({
      merchantId: "m1",
      storeId: "s1",
      phone: "09123333333",
    });

    const { createCompletedSaleAggregate } = await import(
      "../pos/domain/sale.js"
    );

    await sales.save(
      createCompletedSaleAggregate({
        id: "sale-r1",
        merchantId: "m1",
        storeId: "s1",
        membershipId: returner.membership.id,
        customerId: returner.membership.customerId,
        phoneNational: returner.membership.phoneNational,
        tenderType: "cash",
        idempotencyKey: "ik-r1",
        lines: [
          {
            id: "l1",
            productId: "p1",
            productName: "نان",
            quantity: 1,
            unitPriceMinor: 10_000n,
          },
        ],
        now: new Date("2026-07-01T12:00:00.000Z"),
      }),
    );
    await sales.save(
      createCompletedSaleAggregate({
        id: "sale-r2",
        merchantId: "m1",
        storeId: "s1",
        membershipId: returner.membership.id,
        customerId: returner.membership.customerId,
        phoneNational: returner.membership.phoneNational,
        tenderType: "cash",
        idempotencyKey: "ik-r2",
        lines: [
          {
            id: "l2",
            productId: "p1",
            productName: "نان",
            quantity: 1,
            unitPriceMinor: 10_000n,
          },
        ],
        now: new Date("2026-07-20T12:00:00.000Z"),
      }),
    );
    await sales.save(
      createCompletedSaleAggregate({
        id: "sale-l1",
        merchantId: "m1",
        storeId: "s1",
        membershipId: lapsed.membership.id,
        customerId: lapsed.membership.customerId,
        phoneNational: lapsed.membership.phoneNational,
        tenderType: "cash",
        idempotencyKey: "ik-l1",
        lines: [
          {
            id: "l3",
            productId: "p1",
            productName: "شیر",
            quantity: 1,
            unitPriceMinor: 50_000n,
          },
        ],
        now: new Date("2026-04-01T12:00:00.000Z"),
      }),
    );

    const listed = await useCases.listStoreMemberships({
      merchantId: "m1",
      storeId: "s1",
    });
    const byPhone = new Map(
      listed.items.map((i) => [i.membership.phoneNational, i.engagement.segment]),
    );
    expect(byPhone.get(fresh.membership.phoneNational)).toBe("new");
    expect(byPhone.get(returner.membership.phoneNational)).toBe("returning");
    expect(byPhone.get(lapsed.membership.phoneNational)).toBe("lapsed");

    const segments = await useCases.getStoreSegments({
      merchantId: "m1",
      storeId: "s1",
    });
    expect(segments.counts).toMatchObject({ new: 1, returning: 1, lapsed: 1 });
    expect(segments.totalActive).toBe(3);

    const history = await useCases.listMembershipHistory({
      membershipId: returner.membership.id,
    });
    expect(history.sales).toHaveLength(2);
    expect(history.sales[0]!.id).toBe("sale-r2");

    const profile = await useCases.getMembershipProfile({
      membershipId: returner.membership.id,
    });
    expect(profile.engagement.purchaseCount).toBe(2);
    expect(profile.engagement.totalSpendMinor).toBe(20_000n);
    expect(profile.engagement.segment).toBe("returning");

    await useCases.softDeleteMembership({
      membershipId: fresh.membership.id,
    });
    const afterDelete = await useCases.listStoreMemberships({
      merchantId: "m1",
      storeId: "s1",
    });
    expect(afterDelete.items).toHaveLength(2);
    expect(
      afterDelete.items.every((i) => i.membership.id !== fresh.membership.id),
    ).toBe(true);
  });
});

describe("Kasbino Complete Customer CRM System", () => {
  it("creates customer and prevents duplicates by phone per merchant", async () => {
    const {
      InMemoryCustomerRepository,
      InMemoryCrmTagRepository,
      InMemoryCustomerNoteRepository,
      InMemoryCustomerInteractionRepository,
      InMemoryCustomerFollowUpRepository,
    } = await import("./infrastructure/persistence/in-memory-customer-repositories.js");
    const { InMemorySaleRepository } = await import("../pos/infrastructure/index.js");
    const { UnavailableFinanceReader } = await import("../erpnext/index.js");
    const { createCustomerUseCases } = await import("./application/customer-use-cases.js");

    const customers = new InMemoryCustomerRepository();
    const tags = new InMemoryCrmTagRepository();
    const notes = new InMemoryCustomerNoteRepository();
    const interactions = new InMemoryCustomerInteractionRepository();
    const followUps = new InMemoryCustomerFollowUpRepository();
    const sales = new InMemorySaleRepository();
    const financeReader = new UnavailableFinanceReader();

    const crm = createCustomerUseCases({
      customers,
      tags,
      notes,
      interactions,
      followUps,
      sales,
      financeReader,
    });

    const c1 = await crm.createCustomer({
      merchantId: "merchant-a",
      phone: "09129998877",
      displayName: "احمد رضایی",
      customerType: "retail",
    });

    expect(c1.id).toBeDefined();
    expect(c1.phoneNational).toBe("09129998877");
    expect(c1.displayName).toBe("احمد رضایی");

    // Duplicate phone under same merchant should throw
    await expect(
      crm.createCustomer({
        merchantId: "merchant-a",
        phone: "09129998877",
        displayName: "احمد تکراری",
      }),
    ).rejects.toThrow();

    // Same phone under different merchant is allowed (multi-tenant isolation)
    const c2 = await crm.createCustomer({
      merchantId: "merchant-b",
      phone: "09129998877",
      displayName: "احمد کسب‌وکار ب",
    });
    expect(c2.merchantId).toBe("merchant-b");
  });

  it("manages customer notes, tags, interactions and follow-ups with tenant isolation", async () => {
    const {
      InMemoryCustomerRepository,
      InMemoryCrmTagRepository,
      InMemoryCustomerNoteRepository,
      InMemoryCustomerInteractionRepository,
      InMemoryCustomerFollowUpRepository,
    } = await import("./infrastructure/persistence/in-memory-customer-repositories.js");
    const { InMemorySaleRepository } = await import("../pos/infrastructure/index.js");
    const { UnavailableFinanceReader } = await import("../erpnext/index.js");
    const { createCustomerUseCases } = await import("./application/customer-use-cases.js");

    const customers = new InMemoryCustomerRepository();
    const tags = new InMemoryCrmTagRepository();
    const notes = new InMemoryCustomerNoteRepository();
    const interactions = new InMemoryCustomerInteractionRepository();
    const followUps = new InMemoryCustomerFollowUpRepository();
    const sales = new InMemorySaleRepository();
    const financeReader = new UnavailableFinanceReader();

    const crm = createCustomerUseCases({
      customers,
      tags,
      notes,
      interactions,
      followUps,
      sales,
      financeReader,
    });

    const customer = await crm.createCustomer({
      merchantId: "merchant-a",
      phone: "09121110000",
      displayName: "سارا محمدی",
    });

    // Add note
    const note = await crm.addNote({
      merchantId: "merchant-a",
      customerId: customer.id,
      authorId: "staff-1",
      authorName: "علی کارمند",
      content: "مشتری خوش‌برخورد و تمایل به خرید عمده دارد",
    });
    expect(note.id).toBeDefined();

    // Add tag
    const tag = await crm.createTag({
      merchantId: "merchant-a",
      name: "VIP",
      color: "gold",
    });
    await crm.assignTag({
      merchantId: "merchant-a",
      customerId: customer.id,
      tagId: tag.id,
    });

    // Log interaction
    const interaction = await crm.logInteraction({
      merchantId: "merchant-a",
      customerId: customer.id,
      staffId: "staff-1",
      staffName: "علی کارمند",
      type: "call",
      description: "تماس برای پیگیری سفارش قبل",
    });
    expect(interaction.type).toBe("call");

    // Create follow-up
    const followUp = await crm.createFollowUp({
      merchantId: "merchant-a",
      customerId: customer.id,
      assigneeId: "staff-1",
      assigneeName: "علی کارمند",
      description: "پیگیری مانده حساب هفته آینده",
      dueDate: new Date(Date.now() + 86400000),
    });
    expect(followUp.status).toBe("OPEN");

    // Fetch 360 view
    const c360 = await crm.getCustomer360(customer.id, "merchant-a");
    expect(c360.customer.id).toBe(customer.id);
    expect(c360.notes).toHaveLength(1);
    expect(c360.tags).toHaveLength(1);
    expect(c360.interactions).toHaveLength(1);
    expect(c360.followUps).toHaveLength(1);

    // Multi-tenant isolation test: Merchant B CANNOT access Merchant A's Customer 360
    await expect(
      crm.getCustomer360(customer.id, "merchant-b"),
    ).rejects.toThrow();
  });
});

