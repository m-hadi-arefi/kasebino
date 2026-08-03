/**
 * ADR-058 — Audit Logging Architecture.
 *
 * Insert-only Mongo `mos_audit` for sensitive actions via AuditPort.
 * Prefer async-after-commit; never block OLTP / CompleteSale when Mongo is
 * down. In-memory store for tests; official driver / admin HTTP browse /
 * uiuxpromax admin UI remain ARD-022 packaging.
 *
 * Normative: docs/architecture/audit-architecture.md,
 * docs/rules/audit-rules.md, ADR-047 AuditPort shape, ADR-056 / ADR-065.
 */

import {
  AUDIT_TRAIL_PORT,
  PERSIAN_CONTENT_PRESERVATION,
} from "../data-integrity/index.js";
import {
  MONGO_COLLECTIONS,
  TENANCY_AND_AUTHZ,
  UNICODE_PAYLOAD_SAFETY,
} from "../mongodb-analytics/index.js";
import { ISOLATED_INGEST_PATHS } from "../analytics-ingest-isolation/index.js";

/** ADR-058 Decision — binding audit stance. */
export const AUDIT_LOGGING_DECISION = {
  adr: "ADR-058",
  pattern: "insert_only_mos_audit_via_audit_port" as const,
  collection: MONGO_COLLECTIONS.audit,
  insertOnly: true,
  updatesForbidden: true,
  deletesForbiddenExceptRetention: true,
  preferredTiming: AUDIT_TRAIL_PORT.preferredTiming,
  optionalThinPgTable: AUDIT_TRAIL_PORT.optionalThinPgTable,
  optionalThinPgRequired: false,
  neverOltpSourceOfTruth: true,
  onCheckoutCriticalPath: false,
  neverBlockOltp: true,
  accessItselfAudited: true,
  hashChainOptional: true,
  architecturePackage: "src/audit-logging/",
  mongodbPlanePackage: "src/mongodb-analytics/",
  architectureDoc: "docs/architecture/audit-architecture.md",
  rulesDoc: "docs/rules/audit-rules.md",
} as const;

export type AuditResult = "success" | "failure" | "denied";

/**
 * Canonical audit document (audit-architecture.md).
 * before/after are summaries — phones scrubbed; Persian UTF-8 preserved.
 */
export type AuditDocument = {
  eventId: string;
  occurredAt: string;
  merchantId: string | null;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  result: AuditResult;
  ip: string | null;
  userAgent: string | null;
  correlationId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  metadata: Record<string, unknown>;
  ingestedAt: string;
};

export type AuditRecordInput = {
  eventId: string;
  occurredAt?: Date | string;
  merchantId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  result?: AuditResult;
  ip?: string | null;
  userAgent?: string | null;
  correlationId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type AuditInsertResult =
  | { status: "inserted"; eventId: string }
  | { status: "duplicate"; eventId: string };

export type AuditStore = {
  /** Idempotent insert by eventId — duplicates are a no-op (append-only). */
  insertIdempotent(doc: AuditDocument): Promise<AuditInsertResult>;
  findByEventId(eventId: string): Promise<AuditDocument | null>;
  search(input: AuditSearchInput): Promise<AuditDocument[]>;
  count(): Promise<number>;
};

export type AuditSearchInput = {
  merchantId?: string | null;
  actorId?: string | null;
  action?: string;
  entityType?: string;
  entityId?: string | null;
  result?: AuditResult;
  fromOccurredAt?: string;
  toOccurredAt?: string;
  /** When true, allow null merchantId rows (platform_admin). */
  includePlatformScope?: boolean;
  limit?: number;
};

/**
 * AuditPort — application-facing evidence API.
 * record() must never throw to OLTP callers (fail-open + metrics).
 */
export type AuditPort = {
  record(input: AuditRecordInput): Promise<AuditInsertResult | { status: "queued_failed"; eventId: string }>;
};

export type AuditMetricsSnapshot = {
  written: number;
  duplicates: number;
  failed: number;
  viewAudited: number;
  phonesScrubbed: number;
};

export type AuditMetrics = {
  recordWritten(): void;
  recordDuplicate(): void;
  recordFailed(): void;
  recordViewAudited(): void;
  recordPhoneScrubbed(count?: number): void;
  snapshot(): AuditMetricsSnapshot;
};

/** Metric names for audit write / access modes. */
export const AUDIT_METRIC_NAMES = {
  written: "audit_written_total",
  duplicates: "audit_duplicate_total",
  failed: "audit_write_failed_total",
  viewAudited: "audit_view_audited_total",
  phonesScrubbed: "audit_phones_scrubbed_total",
} as const;

/**
 * Sensitive action matrix (audit-architecture.md) — always audited.
 * Wire keys English; Persian labels in AUDIT_ACTION_LABELS_FA.
 */
export const SENSITIVE_AUDIT_ACTIONS = [
  "auth.otp_anomaly",
  "auth.login_success",
  "auth.login_failure",
  "auth.logout_all",
  "auth.role_change",
  "merchant.create",
  "merchant.activate",
  "merchant.suspend",
  "merchant.settings_billing",
  "catalog.price_hard_change",
  "stock.adjust",
  "catalog.mass_delete",
  "sale.complete",
  "sale.cancel",
  "loyalty.redeem",
  "loyalty.manual_adjust",
  "order.status_transition",
  "payment.webhook_paid",
  "admin.platform_action",
  "privacy.customer_soft_delete",
  "privacy.customer_export",
  "audit.view",
  "rate_limit.triggered",
] as const;

export type SensitiveAuditAction = (typeof SENSITIVE_AUDIT_ACTIONS)[number];

/**
 * Persian labels for human audit viewers (ADR-058 Iranian UX).
 * Raw payloads keep English keys.
 */
export const AUDIT_ACTION_LABELS_FA: Record<SensitiveAuditAction, string> = {
  "auth.otp_anomaly": "ناهنجاری درخواست رمز یک‌بارمصرف",
  "auth.login_success": "ورود موفق",
  "auth.login_failure": "ورود ناموفق",
  "auth.logout_all": "خروج از همه نشست‌ها",
  "auth.role_change": "تغییر نقش",
  "merchant.create": "ایجاد پذیرنده",
  "merchant.activate": "فعال‌سازی پذیرنده",
  "merchant.suspend": "تعلیق پذیرنده",
  "merchant.settings_billing": "تنظیمات مالی پذیرنده",
  "catalog.price_hard_change": "تغییر سخت قیمت",
  "stock.adjust": "تعدیل موجودی",
  "catalog.mass_delete": "حذف انبوه کاتالوگ",
  "sale.complete": "تکمیل فروش",
  "sale.cancel": "لغو فروش",
  "loyalty.redeem": "خرج امتیاز وفاداری",
  "loyalty.manual_adjust": "تعدیل دستی وفاداری",
  "order.status_transition": "تغییر وضعیت سفارش",
  "payment.webhook_paid": "تأیید پرداخت وب‌هوک",
  "admin.platform_action": "اقدام ادمین سکو",
  "privacy.customer_soft_delete": "حذف نرم مشتری",
  "privacy.customer_export": "درخواست خروجی داده مشتری",
  "audit.view": "مشاهده گزارش حسابرسی",
  "rate_limit.triggered": "فعال شدن محدودیت نرخ",
};

export const AUDIT_INDEXES = {
  uniqueEventId: "{ eventId: 1 } unique",
  merchantTime: "{ merchantId: 1, occurredAt: -1 }",
  actorTime: "{ actorId: 1, occurredAt: -1 }",
  actionTime: "{ action: 1, occurredAt: -1 }",
  ttlDaysHotSecurity: 365,
  ttlDaysAdmin: 730,
  ttlDaysRoutine: 365,
  ttlMonthsMin: 24,
  ttlMonthsMax: 36,
  ttlNote:
    "TTL / archive per src/data-retention (ADR-064); legal hold overrides",
  retentionAdr: "ADR-064",
  retentionPackage: "src/data-retention/",
} as const;

export const AUDIT_AUTHZ = {
  browseAudience: "platform_admin" as const,
  merchantOwnOperationalAuditOptionalP1: true,
  neverExposeOtherMerchants: true,
  accessItselfAudited: true,
  reservedBrowsePath: "/api/v1/admin/audit",
  reservedDetailPath: "/api/v1/admin/audit/:eventId",
  merchantQueriesMustFilterMerchantId:
    TENANCY_AND_AUTHZ.merchantQueriesMustFilterMerchantId,
} as const;

export const AUDIT_PII_POLICY = {
  minimizeBeforeAfter: true,
  scrubIranianPhones: true,
  phoneRedactionToken: "[phone_redacted]",
  preservePersianUtf8:
    PERSIAN_CONTENT_PRESERVATION.preserveFaInAuditSummaries,
  forbidAsciiScrubOfFa:
    PERSIAN_CONTENT_PRESERVATION.forbidAsciiScrubOfFaAuditPayload,
  neverLogOtpCodes: true,
} as const;

/**
 * Iranian First — wire codes English; human labels Persian; RTL viewer later.
 */
export const AUDIT_LOGGING_UNICODE = {
  preserveUtf8PersianInSummaries:
    UNICODE_PAYLOAD_SAFETY.preserveUtf8PersianInPayloads,
  actionCodesMayStayEnglish: UNICODE_PAYLOAD_SAFETY.eventCodesMayStayEnglish,
  humanLabelsPersian: true,
  merchantTimeBucketsJalaliTehran:
    UNICODE_PAYLOAD_SAFETY.merchantTimeBucketsJalaliTehran,
} as const;

export const AUDIT_LOGGING_UX_FA = {
  locale: "fa-IR" as const,
  dir: "rtl" as const,
  ADMIN_BROWSE_TITLE: "گزارش حسابرسی",
  ADMIN_BROWSE_HINT:
    "اقدامات حساس برای بررسی انطباق؛ فیلتر پذیرنده، بازیگر، و تاریخ شمسی در رابط ادمین.",
  ACCESS_AUDITED_HINT:
    "مشاهدهٔ گزارش حسابرسی نیز ثبت می‌شود.",
  PHONE_SCRUBBED_HINT: "شماره موبایل در جزئیات حسابرسی حذف یا پوشانده می‌شود.",
  OLTP_UNAFFECTED_HINT:
    "قطع بودن پایگاه دادهٔ حسابرسی نباید جلوی ثبت فروش را بگیرد.",
} as const;

export const AUDIT_LOGGING_REQUIREMENTS = {
  insertOnlyMosAudit: true,
  auditPortImplemented: true,
  neverBlockOltp: true,
  phonePiiScrubbed: true,
  persianActionLabels: true,
  accessItselfAudited: true,
  retentionStanceDocumented: true,
  adminBrowseReserved: true,
  offCheckoutCriticalPath: true,
  unicodePersianSummariesSafe: true,
  noProtocolDriverRequiredThisAdr: true,
  optionalThinPgNotRequired: true,
} as const;

export const AUDIT_LOGGING_PLACEMENT = {
  package: "src/audit-logging/",
  collection: MONGO_COLLECTIONS.audit,
  detailAdr: "ADR-058",
  portName: AUDIT_TRAIL_PORT.portName,
  modulesLater: "src/modules/audit/",
} as const;

const IRANIAN_PHONE_PATTERN =
  /(?:\+98|0098|98)?0?9\d{9}|\b09\d{9}\b/g;

function asIso(value: Date | string | undefined, now: () => Date): string {
  if (value === undefined) return now().toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

function asRecord(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return value ? structuredClone(value) : {};
}

/** Mask Iranian mobile numbers in free text. */
export function scrubPhonesInText(text: string): {
  text: string;
  scrubCount: number;
} {
  let scrubCount = 0;
  const scrubbed = text.replace(IRANIAN_PHONE_PATTERN, () => {
    scrubCount += 1;
    return AUDIT_PII_POLICY.phoneRedactionToken;
  });
  return { text: scrubbed, scrubCount };
}

/** Deep-scrub phones in JSON-like summaries without ASCII-scrubbing Persian. */
export function scrubPhonesInValue(
  value: unknown,
): { value: unknown; scrubCount: number } {
  if (typeof value === "string") {
    const { text, scrubCount } = scrubPhonesInText(value);
    return { value: text, scrubCount };
  }
  if (Array.isArray(value)) {
    let scrubCount = 0;
    const next = value.map((item) => {
      const scrubbed = scrubPhonesInValue(item);
      scrubCount += scrubbed.scrubCount;
      return scrubbed.value;
    });
    return { value: next, scrubCount };
  }
  if (value !== null && typeof value === "object") {
    let scrubCount = 0;
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const scrubbed = scrubPhonesInValue(child);
      scrubCount += scrubbed.scrubCount;
      next[key] = scrubbed.value;
    }
    return { value: next, scrubCount };
  }
  return { value, scrubCount: 0 };
}

export function scrubAuditSummaries(input: {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  metadata: Record<string, unknown>;
  scrubCount: number;
} {
  const beforeScrub = scrubPhonesInValue(asRecord(input.before));
  const afterScrub = scrubPhonesInValue(asRecord(input.after));
  const metaScrub = scrubPhonesInValue(asRecord(input.metadata));
  return {
    before: beforeScrub.value as Record<string, unknown>,
    after: afterScrub.value as Record<string, unknown>,
    metadata: metaScrub.value as Record<string, unknown>,
    scrubCount:
      beforeScrub.scrubCount + afterScrub.scrubCount + metaScrub.scrubCount,
  };
}

export function persianLabelForAction(action: string): string {
  if (action in AUDIT_ACTION_LABELS_FA) {
    return AUDIT_ACTION_LABELS_FA[action as SensitiveAuditAction];
  }
  return action;
}

export function isSensitiveAuditAction(action: string): boolean {
  return (SENSITIVE_AUDIT_ACTIONS as readonly string[]).includes(action);
}

export function buildAuditDocument(
  input: AuditRecordInput,
  options?: { now?: () => Date },
): AuditDocument {
  const now = options?.now ?? (() => new Date());
  if (!input.eventId?.trim()) {
    throw new Error("Audit document requires eventId (ADR-058).");
  }
  if (!input.action?.trim()) {
    throw new Error("Audit document requires action (ADR-058).");
  }
  if (!input.entityType?.trim()) {
    throw new Error("Audit document requires entityType (ADR-058).");
  }
  if (!input.correlationId?.trim()) {
    throw new Error("Audit document requires correlationId (ADR-058).");
  }

  const scrubbed = scrubAuditSummaries({
    ...(input.before !== undefined ? { before: input.before } : {}),
    ...(input.after !== undefined ? { after: input.after } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  });

  return {
    eventId: input.eventId,
    occurredAt: asIso(input.occurredAt, now),
    merchantId: input.merchantId ?? null,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    result: input.result ?? "success",
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    correlationId: input.correlationId,
    before: scrubbed.before,
    after: scrubbed.after,
    metadata: {
      ...scrubbed.metadata,
      phonesScrubbed: scrubbed.scrubCount,
      actionLabelFa: persianLabelForAction(input.action),
    },
    ingestedAt: now().toISOString(),
  };
}

export function createInMemoryAuditMetrics(): AuditMetrics {
  let written = 0;
  let duplicates = 0;
  let failed = 0;
  let viewAudited = 0;
  let phonesScrubbed = 0;

  return {
    recordWritten() {
      written += 1;
    },
    recordDuplicate() {
      duplicates += 1;
    },
    recordFailed() {
      failed += 1;
    },
    recordViewAudited() {
      viewAudited += 1;
    },
    recordPhoneScrubbed(count = 1) {
      phonesScrubbed += count;
    },
    snapshot() {
      return { written, duplicates, failed, viewAudited, phonesScrubbed };
    },
  };
}

/**
 * In-memory append-only audit store (tests / worker skeleton).
 * No update/delete methods — insert-only contract.
 */
export class InMemoryAuditStore implements AuditStore {
  private readonly byEventId = new Map<string, AuditDocument>();

  async insertIdempotent(doc: AuditDocument): Promise<AuditInsertResult> {
    assertAuditDocumentShape(doc);
    const existing = this.byEventId.get(doc.eventId);
    if (existing) {
      return { status: "duplicate", eventId: doc.eventId };
    }
    const stored: AuditDocument = {
      ...doc,
      before: structuredClone(doc.before),
      after: structuredClone(doc.after),
      metadata: structuredClone(doc.metadata),
    };
    this.byEventId.set(doc.eventId, stored);
    return { status: "inserted", eventId: doc.eventId };
  }

  async findByEventId(eventId: string): Promise<AuditDocument | null> {
    const existing = this.byEventId.get(eventId);
    return existing ? cloneAuditDoc(existing) : null;
  }

  async search(input: AuditSearchInput): Promise<AuditDocument[]> {
    if (
      input.includePlatformScope !== true &&
      (input.merchantId === undefined ||
        input.merchantId === null ||
        input.merchantId === "")
    ) {
      throw new Error(
        "Merchant-scoped audit search requires merchantId (ADR-058 / ADR-056).",
      );
    }

    const limit = input.limit ?? 100;
    return [...this.byEventId.values()]
      .filter((d) => {
        if (input.merchantId !== undefined && input.merchantId !== null) {
          if (d.merchantId !== input.merchantId) return false;
        }
        if (input.actorId !== undefined && input.actorId !== null) {
          if (d.actorId !== input.actorId) return false;
        }
        if (input.action && d.action !== input.action) return false;
        if (input.entityType && d.entityType !== input.entityType) return false;
        if (input.entityId !== undefined && input.entityId !== null) {
          if (d.entityId !== input.entityId) return false;
        }
        if (input.result && d.result !== input.result) return false;
        if (input.fromOccurredAt) {
          if (Date.parse(d.occurredAt) < Date.parse(input.fromOccurredAt)) {
            return false;
          }
        }
        if (input.toOccurredAt) {
          if (Date.parse(d.occurredAt) > Date.parse(input.toOccurredAt)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, limit)
      .map(cloneAuditDoc);
  }

  async count(): Promise<number> {
    return this.byEventId.size;
  }
}

function cloneAuditDoc(doc: AuditDocument): AuditDocument {
  return {
    ...doc,
    before: structuredClone(doc.before),
    after: structuredClone(doc.after),
    metadata: structuredClone(doc.metadata),
  };
}

export type CreateAuditPortOptions = {
  store: AuditStore;
  metrics?: AuditMetrics;
  now?: () => Date;
  /**
   * When true (default), store failures are swallowed so OLTP never blocks.
   * Retries happen via caller buffer / ARD-022 worker later.
   */
  failOpen?: boolean;
};

/**
 * Create AuditPort — scrub PII, insert to mos_audit, never throw when failOpen.
 */
export function createAuditPort(options: CreateAuditPortOptions): AuditPort {
  const now = options.now ?? (() => new Date());
  const failOpen = options.failOpen !== false;
  const metrics = options.metrics;

  return {
    async record(input) {
      try {
        const doc = buildAuditDocument(input, { now });
        const phones = Number(doc.metadata.phonesScrubbed ?? 0);
        if (phones > 0) {
          metrics?.recordPhoneScrubbed(phones);
        }
        const result = await options.store.insertIdempotent(doc);
        if (result.status === "duplicate") {
          metrics?.recordDuplicate();
          return result;
        }
        metrics?.recordWritten();
        if (doc.action === "audit.view") {
          metrics?.recordViewAudited();
        }
        return result;
      } catch {
        metrics?.recordFailed();
        if (!failOpen) {
          throw new Error("Audit write failed (ADR-058 fail-closed test path).");
        }
        return { status: "queued_failed", eventId: input.eventId };
      }
    },
  };
}

/**
 * Record that a platform_admin viewed audit evidence (access itself audited).
 */
export async function recordAuditViewAccess(
  port: AuditPort,
  input: {
    eventId: string;
    viewerId: string;
    viewerRole?: string;
    merchantId?: string | null;
    correlationId: string;
    viewedEventId: string;
  },
): Promise<AuditInsertResult | { status: "queued_failed"; eventId: string }> {
  return port.record({
    eventId: input.eventId,
    action: "audit.view",
    entityType: "audit",
    entityId: input.viewedEventId,
    actorId: input.viewerId,
    actorRole: input.viewerRole ?? "platform_admin",
    merchantId: input.merchantId ?? null,
    correlationId: input.correlationId,
    result: "success",
    metadata: { viewedEventId: input.viewedEventId },
  });
}

export function assertAuditDocumentShape(doc: AuditDocument): void {
  for (const field of AUDIT_TRAIL_PORT.requiredFields) {
    if (field === "merchantId" || field === "actorId" || field === "entityId") {
      // nullable allowed at evidence layer (platform / system actions)
      continue;
    }
    const value = doc[field as keyof AuditDocument];
    if (value === undefined || value === null || value === "") {
      throw new Error(
        `Audit document missing required field "${field}" (ADR-058).`,
      );
    }
  }
  if (!doc.eventId?.trim()) {
    throw new Error("Audit document requires eventId (ADR-058).");
  }
  if (!doc.action?.trim()) {
    throw new Error("Audit document requires action (ADR-058).");
  }
  if (!["success", "failure", "denied"].includes(doc.result)) {
    throw new Error(`Invalid audit result "${doc.result}" (ADR-058).`);
  }
}

export function assertInsertOnlyAuditApi(input: {
  hasUpdateMethod: boolean;
  hasDeleteMethod: boolean;
}): void {
  if (input.hasUpdateMethod || input.hasDeleteMethod) {
    throw new Error(
      "Audit store must not expose update/delete APIs (ADR-058).",
    );
  }
  if (!AUDIT_LOGGING_DECISION.insertOnly) {
    throw new Error("AUDIT_LOGGING_DECISION.insertOnly must be true (ADR-058).");
  }
}

export function assertAuditNeverBlocksOltp(onCriticalPath: boolean): void {
  if (onCriticalPath) {
    throw new Error(
      "Audit ingest must stay off checkout critical path (ADR-058).",
    );
  }
  if (AUDIT_LOGGING_DECISION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "AUDIT_LOGGING_DECISION.onCheckoutCriticalPath must be false (ADR-058).",
    );
  }
  if (ISOLATED_INGEST_PATHS.auditIngest.onCriticalPath !== false) {
    throw new Error(
      "auditIngest path must stay off critical path (ADR-058 / ADR-065).",
    );
  }
  if (ISOLATED_INGEST_PATHS.auditIngest.failOpenWhenMongoDown !== true) {
    throw new Error(
      "auditIngest must fail-open when Mongo is down (ADR-058 / ADR-065).",
    );
  }
}

export function assertCollectionIsMosAudit(name: string): void {
  if (name !== MONGO_COLLECTIONS.audit) {
    throw new Error(
      `Audit collection must be "${MONGO_COLLECTIONS.audit}" (ADR-058); got "${name}".`,
    );
  }
}

export function assertAuditImplementedHere(packagePath: string): void {
  if (packagePath !== AUDIT_LOGGING_PLACEMENT.package) {
    throw new Error(
      `Audit logging package is ${AUDIT_LOGGING_PLACEMENT.package}; got "${packagePath}".`,
    );
  }
}

export function assertPersianSummaryPreserved(
  original: string,
  stored: string,
): void {
  if (original !== stored) {
    throw new Error(
      "Audit must preserve UTF-8 Persian summary strings without corruption (ADR-058).",
    );
  }
  if (!AUDIT_LOGGING_UNICODE.preserveUtf8PersianInSummaries) {
    throw new Error(
      "AUDIT_LOGGING_UNICODE.preserveUtf8PersianInSummaries must be true (ADR-058).",
    );
  }
}

export function assertNoRawPhoneInAuditDoc(doc: AuditDocument): void {
  const blob = JSON.stringify({
    before: doc.before,
    after: doc.after,
    metadata: doc.metadata,
  });
  // Remaining Iranian mobiles would indicate scrub failure (token itself ok).
  const withoutTokens = blob.split(AUDIT_PII_POLICY.phoneRedactionToken).join("");
  if (/(?:\+98|0098|98)?0?9\d{9}|\b09\d{9}\b/.test(withoutTokens)) {
    throw new Error(
      "Audit before/after/metadata must not retain raw Iranian phones (ADR-058).",
    );
  }
}

export const AUDIT_LOGGING = {
  decision: AUDIT_LOGGING_DECISION,
  actions: SENSITIVE_AUDIT_ACTIONS,
  labelsFa: AUDIT_ACTION_LABELS_FA,
  indexes: AUDIT_INDEXES,
  authz: AUDIT_AUTHZ,
  pii: AUDIT_PII_POLICY,
  unicode: AUDIT_LOGGING_UNICODE,
  uxFa: AUDIT_LOGGING_UX_FA,
  requirements: AUDIT_LOGGING_REQUIREMENTS,
  placement: AUDIT_LOGGING_PLACEMENT,
  metricNames: AUDIT_METRIC_NAMES,
} as const;
