import { describe, expect, it } from "vitest";
import { AUDIT_TRAIL_PORT } from "../../../database/contracts/data-integrity/index.js";
import { MONGO_COLLECTIONS } from "../../../mongodb/contracts/analytics/index.js";
import {
  AUDIT_ACTION_LABELS_FA,
  AUDIT_AUTHZ,
  AUDIT_INDEXES,
  AUDIT_LOGGING,
  AUDIT_LOGGING_DECISION,
  AUDIT_LOGGING_PLACEMENT,
  AUDIT_LOGGING_REQUIREMENTS,
  AUDIT_LOGGING_UX_FA,
  AUDIT_METRIC_NAMES,
  AUDIT_PII_POLICY,
  InMemoryAuditStore,
  SENSITIVE_AUDIT_ACTIONS,
  assertAuditImplementedHere,
  assertAuditNeverBlocksOltp,
  assertCollectionIsMosAudit,
  assertInsertOnlyAuditApi,
  assertNoRawPhoneInAuditDoc,
  assertPersianSummaryPreserved,
  buildAuditDocument,
  createAuditPort,
  createInMemoryAuditMetrics,
  isSensitiveAuditAction,
  persianLabelForAction,
  recordAuditViewAccess,
  scrubPhonesInText,
  scrubPhonesInValue,
} from "./index.js";

describe("ADR-058 Audit Logging Architecture", () => {
  it("locks insert-only mos_audit via AuditPort decision", () => {
    expect(AUDIT_LOGGING_DECISION.adr).toBe("ADR-058");
    expect(AUDIT_LOGGING_DECISION.collection).toBe(MONGO_COLLECTIONS.audit);
    expect(AUDIT_LOGGING_DECISION.insertOnly).toBe(true);
    expect(AUDIT_LOGGING_DECISION.updatesForbidden).toBe(true);
    expect(AUDIT_LOGGING_DECISION.neverBlockOltp).toBe(true);
    expect(AUDIT_LOGGING_DECISION.onCheckoutCriticalPath).toBe(false);
    expect(AUDIT_LOGGING_DECISION.optionalThinPgRequired).toBe(false);
    expect(AUDIT_LOGGING_PLACEMENT.portName).toBe(AUDIT_TRAIL_PORT.portName);
    expect(AUDIT_LOGGING_REQUIREMENTS.auditPortImplemented).toBe(true);
    expect(() => assertCollectionIsMosAudit("mos_audit")).not.toThrow();
    expect(() => assertCollectionIsMosAudit("mos_events")).toThrow(/mos_audit/i);
    expect(() =>
      assertAuditImplementedHere("src/infrastructure/security/contracts/audit-logging/"),
    ).not.toThrow();
    expect(() => assertInsertOnlyAuditApi({
      hasUpdateMethod: false,
      hasDeleteMethod: false,
    })).not.toThrow();
    expect(() =>
      assertInsertOnlyAuditApi({ hasUpdateMethod: true, hasDeleteMethod: false }),
    ).toThrow(/update\/delete/i);
  });

  it("inserts idempotently and forbids mutating prior docs", async () => {
    const store = new InMemoryAuditStore();
    const port = createAuditPort({ store, metrics: createInMemoryAuditMetrics() });

    const first = await port.record({
      eventId: "evt-1",
      action: "sale.complete",
      entityType: "sale",
      entityId: "sale-1",
      merchantId: "m-1",
      actorId: "u-1",
      correlationId: "c-1",
      after: { total: 120000 },
    });
    expect(first).toEqual({ status: "inserted", eventId: "evt-1" });

    const dup = await port.record({
      eventId: "evt-1",
      action: "sale.complete",
      entityType: "sale",
      entityId: "sale-1",
      merchantId: "m-1",
      actorId: "u-1",
      correlationId: "c-1",
      after: { total: 999 },
    });
    expect(dup).toEqual({ status: "duplicate", eventId: "evt-1" });

    const found = await store.findByEventId("evt-1");
    expect(found?.after).toEqual({ total: 120000 });
    expect(store.insertIdempotent).toBeTypeOf("function");
    expect(
      "update" in store || "delete" in store || "remove" in store,
    ).toBe(false);
  });

  it("scrubs Iranian phones while preserving Persian UTF-8", () => {
    const { text, scrubCount } = scrubPhonesInText(
      "مشتری ۰۹۱۲ با شماره 09121234567 و +989121234567 تماس گرفت",
    );
    expect(scrubCount).toBeGreaterThanOrEqual(2);
    expect(text).toContain(AUDIT_PII_POLICY.phoneRedactionToken);
    expect(text).toContain("مشتری");
    expect(text).not.toMatch(/09121234567/);
    expect(text).not.toMatch(/\+989121234567/);

    const persian = "کالای ویژه تهران";
    const nested = scrubPhonesInValue({
      note: persian,
      phone: "09121112233",
      nested: { mobile: "+989121112233" },
    });
    expect(nested.scrubCount).toBe(2);
    expect((nested.value as { note: string }).note).toBe(persian);
    assertPersianSummaryPreserved(
      persian,
      (nested.value as { note: string }).note,
    );

    const doc = buildAuditDocument({
      eventId: "evt-phone",
      action: "privacy.customer_soft_delete",
      entityType: "customer",
      entityId: "cust-1",
      merchantId: "m-1",
      actorId: "staff-1",
      correlationId: "c-phone",
      before: { displayName: "علی رضایی", phone: "09123456789" },
      after: { status: "soft_deleted" },
      metadata: { reasonFa: "درخواست حریم خصوصی" },
    });
    expect(() => assertNoRawPhoneInAuditDoc(doc)).not.toThrow();
    expect(doc.before.displayName).toBe("علی رضایی");
    expect(doc.metadata.reasonFa).toBe("درخواست حریم خصوصی");
    expect(doc.metadata.actionLabelFa).toBe(
      AUDIT_ACTION_LABELS_FA["privacy.customer_soft_delete"],
    );
  });

  it("maps sensitive actions to Persian labels", () => {
    expect(SENSITIVE_AUDIT_ACTIONS).toEqual(
      expect.arrayContaining([
        "auth.role_change",
        "merchant.suspend",
        "stock.adjust",
        "sale.complete",
        "audit.view",
      ]),
    );
    for (const action of SENSITIVE_AUDIT_ACTIONS) {
      expect(isSensitiveAuditAction(action)).toBe(true);
      expect(AUDIT_ACTION_LABELS_FA[action].length).toBeGreaterThan(2);
      expect(persianLabelForAction(action)).toBe(AUDIT_ACTION_LABELS_FA[action]);
    }
    expect(persianLabelForAction("sale.complete")).toBe("تکمیل فروش");
    expect(AUDIT_LOGGING_UX_FA.dir).toBe("rtl");
    expect(AUDIT_LOGGING_UX_FA.locale).toBe("fa-IR");
    expect(AUDIT_LOGGING_UX_FA.ADMIN_BROWSE_TITLE).toContain("حسابرسی");
  });

  it("searches by merchant/actor/action/time with tenant isolation", async () => {
    const store = new InMemoryAuditStore();
    const port = createAuditPort({ store });

    await port.record({
      eventId: "a1",
      action: "stock.adjust",
      entityType: "inventory",
      entityId: "sku-1",
      merchantId: "m-a",
      actorId: "actor-1",
      correlationId: "c1",
      occurredAt: "2026-08-01T10:00:00.000Z",
    });
    await port.record({
      eventId: "a2",
      action: "sale.complete",
      entityType: "sale",
      entityId: "s-1",
      merchantId: "m-a",
      actorId: "actor-2",
      correlationId: "c2",
      occurredAt: "2026-08-02T10:00:00.000Z",
    });
    await port.record({
      eventId: "b1",
      action: "stock.adjust",
      entityType: "inventory",
      entityId: "sku-9",
      merchantId: "m-b",
      actorId: "actor-1",
      correlationId: "c3",
      occurredAt: "2026-08-02T12:00:00.000Z",
    });

    const forMerchant = await store.search({ merchantId: "m-a" });
    expect(forMerchant.map((d) => d.eventId)).toEqual(["a2", "a1"]);

    const byActor = await store.search({
      merchantId: "m-a",
      actorId: "actor-1",
    });
    expect(byActor).toHaveLength(1);
    expect(byActor[0]?.action).toBe("stock.adjust");

    const byAction = await store.search({
      merchantId: "m-a",
      action: "sale.complete",
    });
    expect(byAction).toHaveLength(1);

    const byTime = await store.search({
      merchantId: "m-a",
      fromOccurredAt: "2026-08-02T00:00:00.000Z",
    });
    expect(byTime.map((d) => d.eventId)).toEqual(["a2"]);

    await expect(store.search({})).rejects.toThrow(/merchantId/i);
    expect(AUDIT_AUTHZ.neverExposeOtherMerchants).toBe(true);
    expect(AUDIT_AUTHZ.reservedBrowsePath).toBe("/api/v1/admin/audit");
  });

  it("audits audit view access itself", async () => {
    const store = new InMemoryAuditStore();
    const metrics = createInMemoryAuditMetrics();
    const port = createAuditPort({ store, metrics });

    await port.record({
      eventId: "sensitive-1",
      action: "merchant.suspend",
      entityType: "merchant",
      entityId: "m-1",
      merchantId: "m-1",
      actorId: "admin-1",
      correlationId: "c-view",
    });

    const view = await recordAuditViewAccess(port, {
      eventId: "view-1",
      viewerId: "admin-2",
      viewedEventId: "sensitive-1",
      correlationId: "c-view-2",
      merchantId: "m-1",
    });
    expect(view).toEqual({ status: "inserted", eventId: "view-1" });

    const found = await store.findByEventId("view-1");
    expect(found?.action).toBe("audit.view");
    expect(found?.metadata.actionLabelFa).toBe(AUDIT_ACTION_LABELS_FA["audit.view"]);
    expect(metrics.snapshot().viewAudited).toBe(1);
  });

  it("never blocks OLTP when store fails (fail-open)", async () => {
    const failingStore: InMemoryAuditStore = {
      async insertIdempotent() {
        throw new Error("mongodb_unavailable");
      },
      async findByEventId() {
        return null;
      },
      async search() {
        return [];
      },
      async count() {
        return 0;
      },
    } as unknown as InMemoryAuditStore;

    const metrics = createInMemoryAuditMetrics();
    const port = createAuditPort({
      store: failingStore,
      metrics,
      failOpen: true,
    });

    const result = await port.record({
      eventId: "fail-1",
      action: "sale.complete",
      entityType: "sale",
      entityId: "sale-x",
      merchantId: "m-1",
      actorId: "cashier-1",
      correlationId: "c-fail",
    });
    expect(result).toEqual({ status: "queued_failed", eventId: "fail-1" });
    expect(metrics.snapshot().failed).toBe(1);
    expect(() => assertAuditNeverBlocksOltp(false)).not.toThrow();
    expect(() => assertAuditNeverBlocksOltp(true)).toThrow(/critical path/i);
    expect(AUDIT_METRIC_NAMES.failed).toBe("audit_write_failed_total");
    expect(AUDIT_INDEXES.uniqueEventId).toContain("eventId");
    expect(AUDIT_LOGGING.authz.accessItselfAudited).toBe(true);
  });
});
