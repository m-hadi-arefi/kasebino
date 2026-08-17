/**
 * ADR-064 — Data Retention Strategy.
 *
 * Canonical retention matrix + Mongo TTL specs for analytics/audit streams,
 * legal-hold purge pause, and longer soft-delete grace for store memberships.
 * Soft delete ≠ analytics delete. OLTP business records stay indefinite
 * (Phase-2 archive). Live createIndexes / purge workers → ARD-019 / ARD-021.
 *
 * Normative: docs/architecture/data-retention-architecture.md,
 * docs/rules/mongodb-rules.md, docs/rules/audit-rules.md,
 * ADR-041 / ADR-047 / ADR-056 / ADR-057 / ADR-058.
 */

import { HARD_DELETE_POLICY, SOFT_DELETE } from "../data-integrity/index.js";
import {
  MONGO_COLLECTIONS,
  MONGO_SESSION_COLLECTION,
} from "../../../mongodb/contracts/analytics/index.js";

/** Seconds in one calendar day (Mongo expireAfterSeconds). */
export const SECONDS_PER_DAY = 24 * 60 * 60;

/** Approximate days per month for month-based Mongo TTL defaults. */
export const DAYS_PER_MONTH = 30;

/** ADR-064 Decision — binding retention stance. */
export const DATA_RETENTION_DECISION = {
  adr: "ADR-064",
  pattern: "matrix_ttl_legal_hold_membership_grace" as const,
  clickstreamDaysMin: 90,
  clickstreamDaysMax: 180,
  warehouseMonths: 24,
  auditMonthsMin: 24,
  auditMonthsMax: 36,
  oltpBusinessRecordsIndefinite: true,
  oltpArchivePhase: "phase_2" as const,
  legalHoldOverridesTtl: true,
  softDeleteNotAnalyticsDelete: true,
  environmentOverridableDefaults: true,
  neverTtlPostgresSalesViaAnalytics: true,
  architecturePackage: "src/infrastructure/database/contracts/retention/",
  architectureDoc: "docs/architecture/data-retention-architecture.md",
  mongodbPlanePackage: "src/infrastructure/mongodb/contracts/analytics/",
  dataIntegrityPackage: "src/infrastructure/database/contracts/data-integrity/",
  relatedPackages: {
    clickstream: "src/infrastructure/mongodb/clickstream/",
    sessions: "src/modules/analytics/domain/session/",
    audit: "src/infrastructure/security/contracts/audit-logging/",
    warehouse: "src/events/contracts/event-warehouse/",
  },
  liveTtlJobsDeferred: false,
  liveTtlIndexesImplementedAdr110: true,
  relatedArds: ["ARD-019", "ARD-021", "ARD-022", "ARD-024", "ARD-027"] as const,
} as const;

export type RetentionDataClass =
  | "oltp_sales_orders_ledger"
  | "oltp_customers"
  | "oltp_store_memberships_soft_deleted"
  | "warehouse_domain_events"
  | "clickstream_behavior"
  | "session_analytics"
  | "product_analytics_events"
  | "product_feature_rollups"
  | "audit_security_admin"
  | "security_signals"
  | "mgmt_daily_rollups"
  | "application_logs"
  | "otel_traces";

export type RetentionStore =
  | "postgresql"
  | "mongodb"
  | "log_backend"
  | "trace_backend";

export type RetentionWindow =
  | {
      kind: "indefinite";
      archivePhase?: "phase_2";
      noteEn: string;
    }
  | {
      kind: "soft_delete_then_purge";
      graceMonthsMin: number;
      hardPurgePhase: "phase_2";
      noteEn: string;
    }
  | {
      kind: "ttl_days";
      minDays: number;
      maxDays: number;
      defaultDays: number;
      expireField: string;
    }
  | {
      kind: "ttl_months";
      minMonths: number;
      maxMonths: number;
      defaultMonths: number;
      expireField: string;
    };

/**
 * Default retention matrix (ADR-064 + data-retention-architecture.md).
 * Environment may override documented defaults within class bands.
 */
export const RETENTION_MATRIX: Record<
  RetentionDataClass,
  {
    store: RetentionStore;
    collectionOrTable: string;
    window: RetentionWindow;
    labelEn: string;
  }
> = {
  oltp_sales_orders_ledger: {
    store: "postgresql",
    collectionOrTable: "sales|orders|ledger",
    window: {
      kind: "indefinite",
      archivePhase: "phase_2",
      noteEn:
        "Business records indefinite; archive strategy Phase 2 — never Mongo TTL.",
    },
    labelEn: "Sales / orders / ledger",
  },
  oltp_customers: {
    store: "postgresql",
    collectionOrTable: "customers",
    window: {
      kind: "soft_delete_then_purge",
      graceMonthsMin: 36,
      hardPurgePhase: "phase_2",
      noteEn: "Until soft-delete + purge policy (grace min 36 months).",
    },
    labelEn: "Customers",
  },
  oltp_store_memberships_soft_deleted: {
    store: "postgresql",
    collectionOrTable: HARD_DELETE_POLICY.membershipTable,
    window: {
      kind: "soft_delete_then_purge",
      /** Longer than analytics streams (90–180d) — memberships outlive clickstream. */
      graceMonthsMin: 36,
      hardPurgePhase: "phase_2",
      noteEn:
        "Soft-deleted store_memberships kept ≥36 months before Phase-2 hard purge eligibility; legal hold blocks purge.",
    },
    labelEn: "Store memberships (soft-deleted)",
  },
  warehouse_domain_events: {
    store: "mongodb",
    collectionOrTable: MONGO_COLLECTIONS.events,
    window: {
      kind: "ttl_months",
      minMonths: 24,
      maxMonths: 24,
      defaultMonths: 24,
      expireField: "ingestedAt",
    },
    labelEn: "Domain event warehouse",
  },
  clickstream_behavior: {
    store: "mongodb",
    collectionOrTable: MONGO_COLLECTIONS.behavior,
    window: {
      kind: "ttl_days",
      minDays: 90,
      maxDays: 180,
      defaultDays: 90,
      expireField: "occurredAt",
    },
    labelEn: "Clickstream / behavior",
  },
  session_analytics: {
    store: "mongodb",
    collectionOrTable: MONGO_SESSION_COLLECTION,
    window: {
      kind: "ttl_days",
      minDays: 90,
      maxDays: 180,
      defaultDays: 90,
      expireField: "startedAt",
    },
    labelEn: "Session analytics",
  },
  product_analytics_events: {
    store: "mongodb",
    collectionOrTable: MONGO_COLLECTIONS.product,
    window: {
      kind: "ttl_months",
      minMonths: 12,
      maxMonths: 24,
      defaultMonths: 18,
      expireField: "occurredAt",
    },
    labelEn: "Product analytics events",
  },
  product_feature_rollups: {
    store: "mongodb",
    collectionOrTable: "mos_product_rollups",
    window: {
      kind: "ttl_months",
      minMonths: 24,
      maxMonths: 24,
      defaultMonths: 24,
      expireField: "day",
    },
    labelEn: "Feature usage rollups",
  },
  audit_security_admin: {
    store: "mongodb",
    collectionOrTable: MONGO_COLLECTIONS.audit,
    window: {
      kind: "ttl_months",
      minMonths: 24,
      maxMonths: 36,
      defaultMonths: 24,
      expireField: "occurredAt",
    },
    labelEn: "Audit (security/admin)",
  },
  security_signals: {
    store: "mongodb",
    collectionOrTable: MONGO_COLLECTIONS.security,
    window: {
      kind: "ttl_months",
      minMonths: 12,
      maxMonths: 24,
      defaultMonths: 12,
      expireField: "occurredAt",
    },
    labelEn: "Security signals",
  },
  mgmt_daily_rollups: {
    store: "mongodb",
    collectionOrTable: MONGO_COLLECTIONS.mgmt,
    window: {
      kind: "ttl_months",
      minMonths: 36,
      maxMonths: 36,
      defaultMonths: 36,
      expireField: "day",
    },
    labelEn: "Management daily rollups",
  },
  application_logs: {
    store: "log_backend",
    collectionOrTable: "application_logs",
    window: {
      kind: "ttl_days",
      minDays: 14,
      maxDays: 30,
      defaultDays: 14,
      expireField: "timestamp",
    },
    labelEn: "Application logs",
  },
  otel_traces: {
    store: "trace_backend",
    collectionOrTable: "otel_traces",
    window: {
      kind: "ttl_days",
      minDays: 7,
      maxDays: 14,
      defaultDays: 7,
      expireField: "timestamp",
    },
    labelEn: "OTel traces",
  },
} as const;

/**
 * Focus TTL table — clickstream / sessions / audit / warehouse (ADR-064 brief).
 * expireAfterSeconds uses class defaults (env-overridable within bands).
 */
export const MONGO_TTL_TABLE = {
  clickstream: {
    dataClass: "clickstream_behavior" as const,
    collection: MONGO_COLLECTIONS.behavior,
    expireField: "occurredAt",
    minDays: DATA_RETENTION_DECISION.clickstreamDaysMin,
    maxDays: DATA_RETENTION_DECISION.clickstreamDaysMax,
    defaultDays: 90,
    expireAfterSecondsDefault: 90 * SECONDS_PER_DAY,
    packageStance: "src/infrastructure/mongodb/clickstream/",
    stanceAdr: "ADR-060",
  },
  sessions: {
    dataClass: "session_analytics" as const,
    collection: MONGO_SESSION_COLLECTION,
    expireField: "startedAt",
    minDays: DATA_RETENTION_DECISION.clickstreamDaysMin,
    maxDays: DATA_RETENTION_DECISION.clickstreamDaysMax,
    defaultDays: 90,
    expireAfterSecondsDefault: 90 * SECONDS_PER_DAY,
    packageStance: "src/modules/analytics/domain/session/",
    stanceAdr: "ADR-061",
  },
  audit: {
    dataClass: "audit_security_admin" as const,
    collection: MONGO_COLLECTIONS.audit,
    expireField: "occurredAt",
    minMonths: DATA_RETENTION_DECISION.auditMonthsMin,
    maxMonths: DATA_RETENTION_DECISION.auditMonthsMax,
    defaultMonths: 24,
    expireAfterSecondsDefault: 24 * DAYS_PER_MONTH * SECONDS_PER_DAY,
    packageStance: "src/infrastructure/security/contracts/audit-logging/",
    stanceAdr: "ADR-058",
    subclassHints: {
      securityHotDays: 365,
      adminDays: 730,
      routineDays: 365,
    },
  },
  warehouse: {
    dataClass: "warehouse_domain_events" as const,
    collection: MONGO_COLLECTIONS.events,
    expireField: "ingestedAt",
    months: DATA_RETENTION_DECISION.warehouseMonths,
    defaultMonths: 24,
    expireAfterSecondsDefault: 24 * DAYS_PER_MONTH * SECONDS_PER_DAY,
    packageStance: "src/events/contracts/event-warehouse/",
    stanceAdr: "ADR-057",
  },
} as const;

export type MongoTtlStream = keyof typeof MONGO_TTL_TABLE;

/**
 * Soft-deleted memberships — longer than analytics TTL; hard purge Phase-2.
 */
export const MEMBERSHIP_SOFT_DELETE_RETENTION = {
  table: HARD_DELETE_POLICY.membershipTable,
  softDeleteColumn: SOFT_DELETE.columnSql,
  softDeleteRequired: true,
  /** Grace months before hard-purge eligibility (≫ clickstream 90–180d). */
  graceMonthsMin: 36,
  longerThanAnalyticsStreams: true,
  analyticsMaxDaysCompared: DATA_RETENTION_DECISION.clickstreamDaysMax,
  hardPurgePhase: "phase_2" as const,
  hardPurgeForbiddenInMvp: true,
  requiresRetentionPurgePolicy: true,
  purgePolicyAdr: "ADR-064",
  blockedByLegalHold: true,
  softDeleteNotAnalyticsDelete: true,
  noteEn:
    "Soft-deleted store_memberships outlive Mongo clickstream/session TTLs; hard purge only Phase-2 after grace and no legal hold.",
} as const;

/**
 * Legal hold — pauses TTL / batch purge for scoped tenants or entities.
 */
export const LEGAL_HOLD = {
  overridesTtl: true,
  overridesBatchPurge: true,
  pauseMongoTtlDeletes: true,
  pauseOltpHardPurge: true,
  scopeLevels: ["platform", "merchant", "entity"] as const,
  breakGlassRetentionToolingOnly: true,
  auditDeletesExceptHoldBreakGlass: true,
  openLegalQuestionPhoneStorage: true,
  futureCounselAdr: true,
  noteEn:
    "Active legal hold pauses Mongo TTL deletes and OLTP hard purge for the scoped merchant/entity until released.",
  noteFaKey: "LEGAL_HOLD_ACTIVE" as const,
} as const;

export type LegalHoldScope = (typeof LEGAL_HOLD.scopeLevels)[number];

export type LegalHoldRecord = {
  holdId: string;
  scope: LegalHoldScope;
  merchantId: string | null;
  entityType: string | null;
  entityId: string | null;
  reason: string;
  active: boolean;
  createdAt: string;
  releasedAt: string | null;
};

/** In-memory legal-hold registry for tests / future ops wiring. */
export type LegalHoldRegistry = {
  add(hold: LegalHoldRecord): void;
  release(holdId: string, releasedAt: string): boolean;
  listActive(): LegalHoldRecord[];
  isPurgePaused(input: {
    merchantId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
  }): boolean;
};

export function createInMemoryLegalHoldRegistry(): LegalHoldRegistry {
  const byId = new Map<string, LegalHoldRecord>();

  return {
    add(hold) {
      byId.set(hold.holdId, hold);
    },
    release(holdId, releasedAt) {
      const existing = byId.get(holdId);
      if (!existing || !existing.active) {
        return false;
      }
      byId.set(holdId, {
        ...existing,
        active: false,
        releasedAt,
      });
      return true;
    },
    listActive() {
      return [...byId.values()].filter((h) => h.active);
    },
    isPurgePaused(input) {
      for (const hold of byId.values()) {
        if (!hold.active) {
          continue;
        }
        if (hold.scope === "platform") {
          return true;
        }
        if (
          hold.scope === "merchant" &&
          hold.merchantId != null &&
          hold.merchantId === input.merchantId
        ) {
          return true;
        }
        if (
          hold.scope === "entity" &&
          hold.merchantId != null &&
          hold.merchantId === input.merchantId &&
          hold.entityType != null &&
          hold.entityType === input.entityType &&
          hold.entityId != null &&
          hold.entityId === input.entityId
        ) {
          return true;
        }
      }
      return false;
    },
  };
}

/**
 * Purge mechanics — TTL indexes + batch jobs; never TTL PG sales.
 */
export const PURGE_MECHANICS = {
  mongoTtlIndexesOnOccurredOrIngested: true,
  batchJobsForComplexDeletes: true,
  neverTtlPostgresSalesViaAnalyticsPolicies: true,
  softDeleteNotAnalyticsDelete: true,
  legalHoldOverrides: true,
  liveCreateIndexesDeferred: true,
  noteEn:
    "Mongo TTL on occurredAt/ingestedAt/startedAt; batch jobs for complex OLTP purge; never TTL PostgreSQL sales via analytics policies.",
} as const;

/**
 * Iranian First — Persian privacy / compliance copy for operators.
 * Wire keys English; display always Persian + RTL when exposed.
 */
export const RETENTION_PRIVACY_COPY_FA = {
  LEGAL_HOLD_ACTIVE:
    "نگهداری حقوقی فعال است؛ پاک‌سازی خودکار داده‌ها تا رفع تعلیق متوقف می‌ماند.",
  LEGAL_HOLD_RELEASED:
    "نگهداری حقوقی برداشته شد؛ سیاست نگهداری عادی از سر گرفته می‌شود.",
  DATA_RETENTION_NOTICE:
    "داده‌های تحلیلی و حسابرسی طبق جدول نگهداری حذف یا بایگانی می‌شوند؛ سوابق کسب‌وکار در پایگاه عملیاتی نگه‌داری می‌شوند.",
  SOFT_DELETE_MEMBERSHIP_HINT:
    "عضویت حذف‌شده به‌صورت نرم نگه داشته می‌شود و دیرتر از داده‌های کلیک‌استریم پاک می‌شود.",
  CLICKSTREAM_TTL_HINT:
    "رویدادهای مسیر کاربر معمولاً پس از ۹۰ تا ۱۸۰ روز حذف می‌شوند.",
  SESSION_TTL_HINT:
    "نشست‌های تحلیلی معمولاً پس از ۹۰ تا ۱۸۰ روز حذف می‌شوند.",
  AUDIT_TTL_HINT:
    "سوابق حسابرسی معمولاً بین ۲۴ تا ۳۶ ماه نگه داشته می‌شوند.",
  WAREHOUSE_TTL_HINT:
    "آینهٔ رویدادهای دامنه معمولاً ۲۴ ماه در انبار رویداد می‌ماند.",
  OLTP_INDEFINITE_HINT:
    "سوابق فروش و سفارش‌ها به‌صورت نامحدود در پایگاه عملیاتی می‌مانند تا مرحلهٔ بایگانی.",
  PURGE_BLOCKED_HINT:
    "به‌خاطر نگهداری حقوقی یا مهلت حذف نرم، پاک‌سازی انجام نشد.",
  PRIVACY_CONTACT_HINT:
    "برای درخواست‌های حریم خصوصی با پشتیبانی پلتفرم هماهنگ کنید.",
} as const;

export type RetentionPrivacyCopyKey = keyof typeof RETENTION_PRIVACY_COPY_FA;

export const RETENTION_UX_FA = {
  locale: "fa-IR" as const,
  dir: "rtl" as const,
  TITLE: "سیاست نگهداری داده‌ها",
  HINT: "جدول نگهداری برای انطباق و حریم خصوصی؛ نمایش تاریخ‌ها با تقویم شمسی در رابط عملیات.",
} as const;

export const DATA_RETENTION_REQUIREMENTS = {
  matrixDocumented: true,
  ttlClickstreamSessionsAuditWarehouse: true,
  legalHoldOverridesTtl: true,
  softDeleteNotAnalyticsDelete: true,
  membershipSoftDeleteLongerThanAnalytics: true,
  oltpBusinessIndefinitePhase2Archive: true,
  neverTtlPostgresSales: true,
  persianPrivacyCopyKeys: true,
  envOverridableDefaults: true,
  liveTtlJobsDeferred: false,
  liveTtlIndexesImplementedAdr110: true,
} as const;

export const DATA_RETENTION_PLACEMENT = {
  package: "src/infrastructure/database/contracts/retention/",
  detailAdr: "ADR-064",
  architectureDoc: DATA_RETENTION_DECISION.architectureDoc,
  liveJobsDeferredTo: ["ARD-019", "ARD-021"] as const,
  ttlBootstrapPackage: "src/infrastructure/mongodb/",
  ttlBootstrapAdr: "ADR-110",
} as const;

export function daysToExpireAfterSeconds(days: number): number {
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error(
      `TTL days must be a positive number (ADR-064); got ${days}.`,
    );
  }
  return Math.floor(days * SECONDS_PER_DAY);
}

export function monthsToExpireAfterSeconds(months: number): number {
  if (!Number.isFinite(months) || months <= 0) {
    throw new Error(
      `TTL months must be a positive number (ADR-064); got ${months}.`,
    );
  }
  return Math.floor(months * DAYS_PER_MONTH * SECONDS_PER_DAY);
}

export function resolveTtlDaysInBand(
  value: number,
  minDays: number,
  maxDays: number,
): number {
  if (value < minDays || value > maxDays) {
    throw new Error(
      `TTL days ${value} outside band ${minDays}–${maxDays} (ADR-064).`,
    );
  }
  return value;
}

export function resolveTtlMonthsInBand(
  value: number,
  minMonths: number,
  maxMonths: number,
): number {
  if (value < minMonths || value > maxMonths) {
    throw new Error(
      `TTL months ${value} outside band ${minMonths}–${maxMonths} (ADR-064).`,
    );
  }
  return value;
}

export function persianPrivacyCopy(key: RetentionPrivacyCopyKey): string {
  return RETENTION_PRIVACY_COPY_FA[key];
}

/**
 * Soft delete ≠ analytics delete — OLTP soft-delete must not imply Mongo purge.
 */
export function assertSoftDeleteNotAnalyticsDelete(input: {
  oltpSoftDeleted: boolean;
  forcesAnalyticsDelete: boolean;
}): void {
  if (input.oltpSoftDeleted && input.forcesAnalyticsDelete) {
    throw new Error(
      "OLTP soft delete must not force analytics delete (ADR-064); soft delete ≠ analytics delete.",
    );
  }
}

export function assertLegalHoldBlocksPurge(input: {
  legalHoldActive: boolean;
  attemptingPurge: boolean;
}): void {
  if (input.legalHoldActive && input.attemptingPurge) {
    throw new Error(
      "Legal hold overrides TTL/purge — purge blocked (ADR-064).",
    );
  }
}

export function assertNeverTtlPostgresSales(input: {
  store: RetentionStore;
  appliesMongoStyleTtlToSales: boolean;
}): void {
  if (input.store === "postgresql" && input.appliesMongoStyleTtlToSales) {
    throw new Error(
      "Never TTL PostgreSQL sales via analytics retention policies (ADR-064).",
    );
  }
}

export function assertMembershipHardPurgeAllowed(input: {
  softDeletedAt: string | null;
  now: string;
  graceMonthsMin?: number;
  legalHoldActive: boolean;
  isMvp: boolean;
}): void {
  if (input.isMvp) {
    throw new Error(
      "Hard purge of store_memberships is forbidden in MVP — Phase-2 only (ADR-064).",
    );
  }
  if (input.legalHoldActive) {
    throw new Error("Legal hold blocks membership hard purge (ADR-064).");
  }
  if (input.softDeletedAt == null) {
    throw new Error(
      "Hard purge requires prior soft delete of store_memberships (ADR-064).",
    );
  }
  const grace =
    input.graceMonthsMin ?? MEMBERSHIP_SOFT_DELETE_RETENTION.graceMonthsMin;
  const deleted = Date.parse(input.softDeletedAt);
  const now = Date.parse(input.now);
  if (!Number.isFinite(deleted) || !Number.isFinite(now)) {
    throw new Error("softDeletedAt / now must be ISO timestamps (ADR-064).");
  }
  const graceMs = grace * DAYS_PER_MONTH * SECONDS_PER_DAY * 1000;
  if (now - deleted < graceMs) {
    throw new Error(
      `store_memberships hard purge requires ≥${grace} months soft-delete grace (ADR-064).`,
    );
  }
}

export function assertMongoTtlAlignedWithPackages(input: {
  clickstreamDaysMin: number;
  clickstreamDaysMax: number;
  sessionDaysMin: number;
  sessionDaysMax: number;
  warehouseMonths: number;
  auditCollection: string;
}): void {
  if (
    input.clickstreamDaysMin !== DATA_RETENTION_DECISION.clickstreamDaysMin ||
    input.clickstreamDaysMax !== DATA_RETENTION_DECISION.clickstreamDaysMax
  ) {
    throw new Error("Clickstream TTL band must match ADR-064 (90–180d).");
  }
  if (
    input.sessionDaysMin !== DATA_RETENTION_DECISION.clickstreamDaysMin ||
    input.sessionDaysMax !== DATA_RETENTION_DECISION.clickstreamDaysMax
  ) {
    throw new Error("Session TTL band must match ADR-064 (90–180d).");
  }
  if (input.warehouseMonths !== DATA_RETENTION_DECISION.warehouseMonths) {
    throw new Error("Warehouse TTL must be 24 months (ADR-064).");
  }
  if (input.auditCollection !== MONGO_COLLECTIONS.audit) {
    throw new Error("Audit TTL collection must be mos_audit (ADR-064).");
  }
}

export function assertRetentionImplementedHere(packagePath: string): void {
  if (packagePath !== DATA_RETENTION_PLACEMENT.package) {
    throw new Error(
      `Data retention must be implemented in ${DATA_RETENTION_PLACEMENT.package} (ADR-064); got "${packagePath}".`,
    );
  }
}

export function assertPersianPrivacyCopyPresent(): void {
  const keys = Object.keys(RETENTION_PRIVACY_COPY_FA) as RetentionPrivacyCopyKey[];
  if (keys.length < 8) {
    throw new Error("Persian privacy copy keys incomplete (ADR-064).");
  }
  for (const key of keys) {
    const value = RETENTION_PRIVACY_COPY_FA[key];
    if (!value || value.trim().length === 0) {
      throw new Error(`Persian privacy copy empty for ${key} (ADR-064).`);
    }
    if (!/[\u0600-\u06FF]/.test(value)) {
      throw new Error(
        `Persian privacy copy must contain Persian script (${key}) (ADR-064).`,
      );
    }
  }
  if (RETENTION_UX_FA.dir !== "rtl" || RETENTION_UX_FA.locale !== "fa-IR") {
    throw new Error("Retention UX stubs must be fa-IR / rtl (ADR-064).");
  }
}

export const DATA_RETENTION = {
  decision: DATA_RETENTION_DECISION,
  matrix: RETENTION_MATRIX,
  mongoTtlTable: MONGO_TTL_TABLE,
  membershipSoftDelete: MEMBERSHIP_SOFT_DELETE_RETENTION,
  legalHold: LEGAL_HOLD,
  purgeMechanics: PURGE_MECHANICS,
  privacyCopyFa: RETENTION_PRIVACY_COPY_FA,
  uxFa: RETENTION_UX_FA,
  requirements: DATA_RETENTION_REQUIREMENTS,
  placement: DATA_RETENTION_PLACEMENT,
} as const;
