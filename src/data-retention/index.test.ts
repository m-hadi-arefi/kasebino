import { describe, expect, it } from "vitest";
import { AUDIT_LOGGING_DECISION } from "../audit-logging/index.js";
import { CLICKSTREAM_DECISION } from "../clickstream/index.js";
import { HARD_DELETE_POLICY } from "../data-integrity/index.js";
import { EVENT_WAREHOUSE_DECISION } from "../event-warehouse/index.js";
import {
  MONGO_COLLECTIONS,
  MONGO_SESSION_COLLECTION,
} from "../mongodb-analytics/index.js";
import { SESSION_ANALYTICS_DECISION } from "../session-analytics/index.js";
import {
  DATA_RETENTION,
  DATA_RETENTION_DECISION,
  DATA_RETENTION_PLACEMENT,
  DATA_RETENTION_REQUIREMENTS,
  DAYS_PER_MONTH,
  LEGAL_HOLD,
  MEMBERSHIP_SOFT_DELETE_RETENTION,
  MONGO_TTL_TABLE,
  PURGE_MECHANICS,
  RETENTION_MATRIX,
  RETENTION_PRIVACY_COPY_FA,
  RETENTION_UX_FA,
  SECONDS_PER_DAY,
  assertLegalHoldBlocksPurge,
  assertMembershipHardPurgeAllowed,
  assertMongoTtlAlignedWithPackages,
  assertNeverTtlPostgresSales,
  assertPersianPrivacyCopyPresent,
  assertRetentionImplementedHere,
  assertSoftDeleteNotAnalyticsDelete,
  createInMemoryLegalHoldRegistry,
  daysToExpireAfterSeconds,
  monthsToExpireAfterSeconds,
  persianPrivacyCopy,
  resolveTtlDaysInBand,
  resolveTtlMonthsInBand,
} from "./index.js";

describe("ADR-064 Data Retention Strategy", () => {
  it("locks decision matrix + placement", () => {
    expect(DATA_RETENTION_DECISION.adr).toBe("ADR-064");
    expect(DATA_RETENTION_DECISION.clickstreamDaysMin).toBe(90);
    expect(DATA_RETENTION_DECISION.clickstreamDaysMax).toBe(180);
    expect(DATA_RETENTION_DECISION.warehouseMonths).toBe(24);
    expect(DATA_RETENTION_DECISION.auditMonthsMin).toBe(24);
    expect(DATA_RETENTION_DECISION.auditMonthsMax).toBe(36);
    expect(DATA_RETENTION_DECISION.oltpBusinessRecordsIndefinite).toBe(true);
    expect(DATA_RETENTION_DECISION.legalHoldOverridesTtl).toBe(true);
    expect(DATA_RETENTION_DECISION.softDeleteNotAnalyticsDelete).toBe(true);
    expect(DATA_RETENTION_PLACEMENT.package).toBe("src/data-retention/");
    expect(DATA_RETENTION.requirements).toEqual(DATA_RETENTION_REQUIREMENTS);
    expect(() =>
      assertRetentionImplementedHere("src/data-retention/"),
    ).not.toThrow();
    expect(() => assertRetentionImplementedHere("src/other/")).toThrow(
      /data-retention/i,
    );
  });

  it("defines TTL table for clickstream / sessions / audit / warehouse", () => {
    expect(MONGO_TTL_TABLE.clickstream.collection).toBe(
      MONGO_COLLECTIONS.behavior,
    );
    expect(MONGO_TTL_TABLE.clickstream.minDays).toBe(90);
    expect(MONGO_TTL_TABLE.clickstream.maxDays).toBe(180);
    expect(MONGO_TTL_TABLE.clickstream.expireField).toBe("occurredAt");
    expect(MONGO_TTL_TABLE.clickstream.expireAfterSecondsDefault).toBe(
      90 * SECONDS_PER_DAY,
    );

    expect(MONGO_TTL_TABLE.sessions.collection).toBe(MONGO_SESSION_COLLECTION);
    expect(MONGO_TTL_TABLE.sessions.minDays).toBe(90);
    expect(MONGO_TTL_TABLE.sessions.maxDays).toBe(180);
    expect(MONGO_TTL_TABLE.sessions.expireField).toBe("startedAt");

    expect(MONGO_TTL_TABLE.audit.collection).toBe(MONGO_COLLECTIONS.audit);
    expect(MONGO_TTL_TABLE.audit.minMonths).toBe(24);
    expect(MONGO_TTL_TABLE.audit.maxMonths).toBe(36);
    expect(MONGO_TTL_TABLE.audit.expireField).toBe("occurredAt");
    expect(MONGO_TTL_TABLE.audit.expireAfterSecondsDefault).toBe(
      24 * DAYS_PER_MONTH * SECONDS_PER_DAY,
    );

    expect(MONGO_TTL_TABLE.warehouse.collection).toBe(MONGO_COLLECTIONS.events);
    expect(MONGO_TTL_TABLE.warehouse.months).toBe(24);
    expect(MONGO_TTL_TABLE.warehouse.expireField).toBe("ingestedAt");
  });

  it("aligns package TTL stances with ADR-064", () => {
    expect(() =>
      assertMongoTtlAlignedWithPackages({
        clickstreamDaysMin: CLICKSTREAM_DECISION.ttlDaysMin,
        clickstreamDaysMax: CLICKSTREAM_DECISION.ttlDaysMax,
        sessionDaysMin: SESSION_ANALYTICS_DECISION.ttlDaysMin,
        sessionDaysMax: SESSION_ANALYTICS_DECISION.ttlDaysMax,
        warehouseMonths: EVENT_WAREHOUSE_DECISION.ttlMonths,
        auditCollection: AUDIT_LOGGING_DECISION.collection,
      }),
    ).not.toThrow();
  });

  it("encodes full retention matrix from architecture", () => {
    expect(RETENTION_MATRIX.oltp_sales_orders_ledger.store).toBe("postgresql");
    expect(RETENTION_MATRIX.oltp_sales_orders_ledger.window.kind).toBe(
      "indefinite",
    );
    expect(RETENTION_MATRIX.clickstream_behavior.window).toMatchObject({
      kind: "ttl_days",
      minDays: 90,
      maxDays: 180,
    });
    expect(RETENTION_MATRIX.session_analytics.window).toMatchObject({
      kind: "ttl_days",
      minDays: 90,
      maxDays: 180,
    });
    expect(RETENTION_MATRIX.warehouse_domain_events.window).toMatchObject({
      kind: "ttl_months",
      defaultMonths: 24,
    });
    expect(RETENTION_MATRIX.audit_security_admin.window).toMatchObject({
      kind: "ttl_months",
      minMonths: 24,
      maxMonths: 36,
    });
    expect(PURGE_MECHANICS.neverTtlPostgresSalesViaAnalyticsPolicies).toBe(
      true,
    );
    expect(() =>
      assertNeverTtlPostgresSales({
        store: "postgresql",
        appliesMongoStyleTtlToSales: true,
      }),
    ).toThrow(/Never TTL PostgreSQL sales/i);
    expect(() =>
      assertNeverTtlPostgresSales({
        store: "postgresql",
        appliesMongoStyleTtlToSales: false,
      }),
    ).not.toThrow();
  });

  it("keeps soft-deleted memberships longer than analytics streams", () => {
    expect(MEMBERSHIP_SOFT_DELETE_RETENTION.table).toBe(
      HARD_DELETE_POLICY.membershipTable,
    );
    expect(MEMBERSHIP_SOFT_DELETE_RETENTION.graceMonthsMin).toBe(36);
    expect(MEMBERSHIP_SOFT_DELETE_RETENTION.longerThanAnalyticsStreams).toBe(
      true,
    );
    expect(MEMBERSHIP_SOFT_DELETE_RETENTION.analyticsMaxDaysCompared).toBe(180);
    expect(
      MEMBERSHIP_SOFT_DELETE_RETENTION.graceMonthsMin * DAYS_PER_MONTH,
    ).toBeGreaterThan(MEMBERSHIP_SOFT_DELETE_RETENTION.analyticsMaxDaysCompared);
    expect(MEMBERSHIP_SOFT_DELETE_RETENTION.hardPurgeForbiddenInMvp).toBe(true);
    expect(MEMBERSHIP_SOFT_DELETE_RETENTION.purgePolicyAdr).toBe("ADR-064");

    expect(() =>
      assertMembershipHardPurgeAllowed({
        softDeletedAt: "2020-01-01T00:00:00.000Z",
        now: "2024-01-01T00:00:00.000Z",
        legalHoldActive: false,
        isMvp: true,
      }),
    ).toThrow(/MVP/i);

    expect(() =>
      assertMembershipHardPurgeAllowed({
        softDeletedAt: "2023-12-01T00:00:00.000Z",
        now: "2024-01-01T00:00:00.000Z",
        legalHoldActive: false,
        isMvp: false,
      }),
    ).toThrow(/grace/i);

    expect(() =>
      assertMembershipHardPurgeAllowed({
        softDeletedAt: "2020-01-01T00:00:00.000Z",
        now: "2024-01-01T00:00:00.000Z",
        legalHoldActive: true,
        isMvp: false,
      }),
    ).toThrow(/Legal hold/i);

    expect(() =>
      assertMembershipHardPurgeAllowed({
        softDeletedAt: "2020-01-01T00:00:00.000Z",
        now: "2024-01-01T00:00:00.000Z",
        legalHoldActive: false,
        isMvp: false,
      }),
    ).not.toThrow();
  });

  it("legal hold overrides TTL purge", () => {
    expect(LEGAL_HOLD.overridesTtl).toBe(true);
    expect(LEGAL_HOLD.pauseMongoTtlDeletes).toBe(true);
    expect(() =>
      assertLegalHoldBlocksPurge({
        legalHoldActive: true,
        attemptingPurge: true,
      }),
    ).toThrow(/Legal hold/i);
    expect(() =>
      assertLegalHoldBlocksPurge({
        legalHoldActive: false,
        attemptingPurge: true,
      }),
    ).not.toThrow();

    const registry = createInMemoryLegalHoldRegistry();
    registry.add({
      holdId: "hold-1",
      scope: "merchant",
      merchantId: "m1",
      entityType: null,
      entityId: null,
      reason: "dispute",
      active: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      releasedAt: null,
    });
    expect(registry.isPurgePaused({ merchantId: "m1" })).toBe(true);
    expect(registry.isPurgePaused({ merchantId: "m2" })).toBe(false);
    expect(registry.release("hold-1", "2024-02-01T00:00:00.000Z")).toBe(true);
    expect(registry.isPurgePaused({ merchantId: "m1" })).toBe(false);
    expect(registry.listActive()).toHaveLength(0);
  });

  it("soft delete is not analytics delete", () => {
    expect(DATA_RETENTION_DECISION.softDeleteNotAnalyticsDelete).toBe(true);
    expect(() =>
      assertSoftDeleteNotAnalyticsDelete({
        oltpSoftDeleted: true,
        forcesAnalyticsDelete: true,
      }),
    ).toThrow(/soft delete/i);
    expect(() =>
      assertSoftDeleteNotAnalyticsDelete({
        oltpSoftDeleted: true,
        forcesAnalyticsDelete: false,
      }),
    ).not.toThrow();
  });

  it("converts TTL bands and rejects out-of-band overrides", () => {
    expect(daysToExpireAfterSeconds(90)).toBe(90 * SECONDS_PER_DAY);
    expect(monthsToExpireAfterSeconds(24)).toBe(
      24 * DAYS_PER_MONTH * SECONDS_PER_DAY,
    );
    expect(resolveTtlDaysInBand(120, 90, 180)).toBe(120);
    expect(() => resolveTtlDaysInBand(30, 90, 180)).toThrow(/band/i);
    expect(resolveTtlMonthsInBand(30, 24, 36)).toBe(30);
    expect(() => resolveTtlMonthsInBand(12, 24, 36)).toThrow(/band/i);
    expect(() => daysToExpireAfterSeconds(0)).toThrow(/positive/i);
  });

  it("ships Persian privacy copy keys + RTL stubs", () => {
    expect(RETENTION_UX_FA.locale).toBe("fa-IR");
    expect(RETENTION_UX_FA.dir).toBe("rtl");
    expect(persianPrivacyCopy("LEGAL_HOLD_ACTIVE")).toBe(
      RETENTION_PRIVACY_COPY_FA.LEGAL_HOLD_ACTIVE,
    );
    expect(RETENTION_PRIVACY_COPY_FA.SOFT_DELETE_MEMBERSHIP_HINT).toMatch(
      /[\u0600-\u06FF]/,
    );
    expect(RETENTION_PRIVACY_COPY_FA.CLICKSTREAM_TTL_HINT).toMatch(
      /[\u0600-\u06FF]/,
    );
    expect(RETENTION_PRIVACY_COPY_FA.AUDIT_TTL_HINT).toMatch(/[\u0600-\u06FF]/);
    expect(RETENTION_PRIVACY_COPY_FA.WAREHOUSE_TTL_HINT).toMatch(
      /[\u0600-\u06FF]/,
    );
    expect(() => assertPersianPrivacyCopyPresent()).not.toThrow();
  });
});
