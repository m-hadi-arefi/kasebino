/**
 * ADR-047 — Data Integrity Soft Delete and Audit Fields contract.
 *
 * Soft delete, mandatory audit timestamps, optional actor attribution,
 * optimistic versioning, and AuditPort shape for sensitive mutations.
 * Concrete domain tables land with domain ADRs; Mongo mos_audit →
 * `src/infrastructure/security/contracts/audit-logging/` (ADR-058).
 *
 * Normative prose: docs/architecture/data-modeling-guidelines.md,
 * docs/architecture/audit-architecture.md, docs/architecture/16-storage-architecture.md
 */

import {
  AUDIT_TIMESTAMPS,
  OPTIMISTIC_LOCK,
  SOFT_DELETE as MODELING_SOFT_DELETE,
  assertAuditTimestampsUtc,
  assertOptimisticVersionWhenConcurrent,
  assertSoftDeleteColumnOptional,
} from "../modeling/index.js";
import {
  PARTIAL_INDEXES,
  UNIQUE_BUSINESS_KEYS,
} from "../indexing/index.js";
import { SOFT_DELETE_FILTER } from "../query-design/index.js";
import { UTF8_PERSIAN_TEXT } from "../postgresql-architecture/index.js";

/** Soft delete: nullable deleted_at; default reads exclude deleted rows. */
export const SOFT_DELETE = {
  columnSql: MODELING_SOFT_DELETE.column.sql,
  typeSql: MODELING_SOFT_DELETE.column.type,
  nullable: MODELING_SOFT_DELETE.column.nullable,
  requiredWhen: "customer_visible_or_auditable_or_membership",
  requiredEntityExamples: [
    "customers",
    "products",
    "stores",
    "store_memberships",
  ] as const,
  optionalOnlyFor: ["ephemeral_system_scratch", "pure_idempotency_keys"] as const,
  defaultReadsExcludeDeleted: MODELING_SOFT_DELETE.defaultReadsExcludeDeleted,
  defaultReadPredicate: SOFT_DELETE_FILTER.predicateWhenApplies,
  supportsCrmRestore: true,
  partialUniquesRequired: MODELING_SOFT_DELETE.partialUniquesWhenSoftDelete,
  purgeJobsDeferred: true,
  /** Hard-purge eligibility / grace → `src/infrastructure/database/contracts/retention` (ADR-064). */
  purgePolicyAdr: "ADR-064",
  purgePolicyPackage: "src/infrastructure/database/contracts/retention/",
} as const;

/** Mandatory row timestamps — UTC timestamptz on every OLTP table. */
export const AUDIT_FIELDS = {
  createdAt: AUDIT_TIMESTAMPS.createdAt,
  updatedAt: AUDIT_TIMESTAMPS.updatedAt,
  storageTimezone: AUDIT_TIMESTAMPS.storageTimezone,
  displayTimezone: AUDIT_TIMESTAMPS.displayTimezone,
  requiredOnEveryTable: AUDIT_TIMESTAMPS.requiredOnEveryTable,
} as const;

/**
 * Optional actor attribution on rows that need "who created".
 * Does not replace AuditPort for sensitive mutations.
 */
export const CREATED_BY = {
  optional: true,
  columnSql: "created_by",
  typeSql: "uuid",
  nullable: true,
  when: "actor_attribution_required",
  doesNotReplaceAuditPort: true,
} as const;

/** Optimistic locking — deepen ADR-043; required with concurrent writers. */
export const OPTIMISTIC_VERSION = {
  columnSql: OPTIMISTIC_LOCK.columnSql,
  typeSql: OPTIMISTIC_LOCK.typeSql,
  notNullDefault: OPTIMISTIC_LOCK.notNullDefault,
  when: OPTIMISTIC_LOCK.when,
  requiredCandidates: OPTIMISTIC_LOCK.requiredCandidates,
  updatePattern: "WHERE id = $1 AND version = $2 THEN version = version + 1",
} as const;

/**
 * Soft-delete tables must use partial unique indexes so keys can be reused
 * after soft delete (aligns ADR-044).
 */
export const PARTIAL_UNIQUES = {
  requiredWhenSoftDelete: true,
  predicate: UNIQUE_BUSINESS_KEYS.softDeletePartialPredicate,
  alignsWithIndexing:
    UNIQUE_BUSINESS_KEYS.softDeletePartialRequiredWhenSoftDelete === true &&
    PARTIAL_INDEXES.defaultActivePredicate === "deleted_at IS NULL",
  examples: UNIQUE_BUSINESS_KEYS.examples,
} as const;

/**
 * Hard delete policy — never remove auditable business rows or memberships
 * without an explicit retention/purge policy.
 */
export const HARD_DELETE_POLICY = {
  forbidHardDeleteAuditableInMvp: true,
  forbidHardDeleteMembershipsWithoutPolicy: true,
  membershipTable: "store_memberships",
  preferSoftDelete: true,
  onDeletePreferRestrictPlusSoftDelete: true,
  purgeOnlyViaRetentionPolicy: true,
  retentionPurgePolicyAdr: "ADR-064",
  retentionPurgePolicyPackage: "src/infrastructure/database/contracts/retention/",
  codingRule: "docs/rules/coding-rules.md",
} as const;

/**
 * Audit trail port — Mongo mos_audit insert-only via `src/infrastructure/security/contracts/audit-logging/` (ADR-058).
 * Optional thin PostgreSQL audit_logs may coexist for same-TX bootstrap.
 */
export const AUDIT_TRAIL_PORT = {
  portName: "AuditPort",
  invokedAfterSensitiveMutation: true,
  preferredTiming: "async_after_commit",
  insertOnly: true,
  forbidUpdateApi: true,
  forbidDeleteApi: true,
  primaryDestination: "mongodb_mos_audit",
  optionalThinPgTable: "audit_logs",
  implementationAdr: "ADR-058",
  implementationPackage: "src/infrastructure/security/contracts/audit-logging/",
  architectureDoc: "docs/architecture/audit-architecture.md",
  requiredFields: [
    "eventId",
    "occurredAt",
    "merchantId",
    "actorId",
    "action",
    "entityType",
    "entityId",
    "correlationId",
  ] as const,
  sensitiveActionExamples: [
    "auth.role_change",
    "merchant.suspend",
    "stock.adjust",
    "sale.complete",
    "sale.cancel",
    "wallet.redeem",
    "customer.soft_delete",
  ] as const,
} as const;

/**
 * Iranian First — soft-deleted rows and audit summaries keep Persian UTF-8.
 * Never ASCII-scrub fa product/customer content in audit payloads.
 */
export const PERSIAN_CONTENT_PRESERVATION = {
  encoding: UTF8_PERSIAN_TEXT.encoding,
  supportsPersianText: UTF8_PERSIAN_TEXT.supportsPersianText,
  asciiOnlyCollationsForbidden: UTF8_PERSIAN_TEXT.asciiOnlyCollationsForbidden,
  preserveFaInSoftDeletedRows: true,
  preserveFaInAuditSummaries: true,
  forbidAsciiScrubOfFaAuditPayload: true,
} as const;

export const DATA_INTEGRITY_REQUIREMENTS = {
  softDeleteDeletedAt: true,
  createdAtUpdatedAtMandatory: true,
  createdByOptional: true,
  optimisticVersionWhenConcurrent: true,
  partialUniquesWhenSoftDelete: true,
  noHardDeleteMembershipsWithoutPolicy: true,
  noHardDeleteAuditableWithoutPolicy: true,
  auditPortDeferredToAdr058: false,
  auditPortImplementedAdr058: true,
  preservePersianUtf8InAuditAndSoftDelete: true,
  noDomainTablesInThisAdr: true,
  purgeJobsFuture: true,
} as const;

export type SoftDeleteEntityClass =
  | "customer_visible"
  | "auditable"
  | "membership"
  | "ephemeral_system";

export function assertSoftDeleteRequired(entityClass: SoftDeleteEntityClass): void {
  if (entityClass === "ephemeral_system") {
    return;
  }
  assertSoftDeleteColumnOptional(true);
  if (SOFT_DELETE.columnSql !== "deleted_at") {
    throw new Error('Soft-delete column must be "deleted_at" (ADR-047).');
  }
  if (SOFT_DELETE.typeSql !== "timestamptz") {
    throw new Error("deleted_at must be timestamptz (ADR-047).");
  }
  if (!SOFT_DELETE.nullable) {
    throw new Error("deleted_at must be nullable (ADR-047).");
  }
}

export function assertDefaultReadsExcludeDeleted(
  tableUsesSoftDelete: boolean,
  includesDeletedAtIsNull: boolean,
): void {
  if (tableUsesSoftDelete && !includesDeletedAtIsNull) {
    throw new Error(
      'Default reads on soft-delete tables must include "deleted_at IS NULL" (ADR-047).',
    );
  }
}

export function assertMandatoryAuditTimestamps(input: {
  hasCreatedAt: boolean;
  hasUpdatedAt: boolean;
  storageTimezone: string;
}): void {
  if (!input.hasCreatedAt || !input.hasUpdatedAt) {
    throw new Error(
      "Every OLTP table requires created_at and updated_at (ADR-047).",
    );
  }
  assertAuditTimestampsUtc(input.storageTimezone);
}

export function assertCreatedByOptional(input: {
  includesCreatedBy: boolean;
  typeSql?: string;
}): void {
  if (!input.includesCreatedBy) {
    return;
  }
  if (input.typeSql !== undefined && input.typeSql !== CREATED_BY.typeSql) {
    throw new Error(
      `created_by must be uuid when present (ADR-047); got "${input.typeSql}".`,
    );
  }
}

export function assertOptimisticVersion(
  hasConcurrentWriters: boolean,
  hasVersionColumn: boolean,
): void {
  assertOptimisticVersionWhenConcurrent(
    hasConcurrentWriters,
    hasVersionColumn,
  );
}

export function assertPartialUniqueWhenSoftDelete(input: {
  usesSoftDelete: boolean;
  uniquePredicate?: string | null;
}): void {
  if (!input.usesSoftDelete) {
    return;
  }
  const predicate = input.uniquePredicate ?? "";
  if (!predicate.includes("deleted_at IS NULL")) {
    throw new Error(
      'Soft-delete unique keys require partial predicate including "deleted_at IS NULL" (ADR-047).',
    );
  }
}

export function assertNoHardDeleteWithoutPolicy(input: {
  entity: string;
  isHardDelete: boolean;
  hasRetentionPurgePolicy: boolean;
  isAuditable?: boolean;
}): void {
  if (!input.isHardDelete) {
    return;
  }
  const isMembership =
    input.entity === HARD_DELETE_POLICY.membershipTable ||
    input.entity === "membership" ||
    input.entity === "store_membership";
  const isAuditable = input.isAuditable === true || isMembership;
  if (isAuditable && !input.hasRetentionPurgePolicy) {
    throw new Error(
      `Hard delete of "${input.entity}" is forbidden without retention/purge policy (ADR-047).`,
    );
  }
}

export function assertAuditPortContract(input: {
  insertOnly: boolean;
  allowsUpdate: boolean;
  allowsDelete: boolean;
  primaryDestination: string;
  implementationAdr: string;
}): void {
  if (!input.insertOnly || input.allowsUpdate || input.allowsDelete) {
    throw new Error(
      "AuditPort must be insert-only with no update/delete API (ADR-047 / ADR-058).",
    );
  }
  if (input.primaryDestination !== AUDIT_TRAIL_PORT.primaryDestination) {
    throw new Error(
      `AuditPort primary destination must be "${AUDIT_TRAIL_PORT.primaryDestination}" (ADR-047).`,
    );
  }
  if (input.implementationAdr !== AUDIT_TRAIL_PORT.implementationAdr) {
    throw new Error(
      `AuditPort implementation ADR must be ${AUDIT_TRAIL_PORT.implementationAdr} (ADR-047 / ADR-058).`,
    );
  }
}

export function assertPersianContentPreserved(input: {
  encoding?: string;
  asciiScrubsFaAuditPayload?: boolean;
  dropsFaOnSoftDelete?: boolean;
}): void {
  const encoding = input.encoding ?? PERSIAN_CONTENT_PRESERVATION.encoding;
  if (encoding.toUpperCase() !== "UTF8" && encoding.toUpperCase() !== "UTF-8") {
    throw new Error(
      "Soft-delete/audit must preserve UTF-8 Persian content (ADR-047 Iranian First).",
    );
  }
  if (input.asciiScrubsFaAuditPayload === true) {
    throw new Error(
      "Must not ASCII-scrub Persian content in audit summaries (ADR-047).",
    );
  }
  if (input.dropsFaOnSoftDelete === true) {
    throw new Error(
      "Soft delete must not drop/corrupt Persian row content (ADR-047).",
    );
  }
}

export const DATA_INTEGRITY = {
  softDelete: SOFT_DELETE,
  auditFields: AUDIT_FIELDS,
  createdBy: CREATED_BY,
  optimisticVersion: OPTIMISTIC_VERSION,
  partialUniques: PARTIAL_UNIQUES,
  hardDeletePolicy: HARD_DELETE_POLICY,
  auditTrailPort: AUDIT_TRAIL_PORT,
  persianContentPreservation: PERSIAN_CONTENT_PRESERVATION,
  requirements: DATA_INTEGRITY_REQUIREMENTS,
  alignsWith: {
    modelingSoftDeleteColumn: MODELING_SOFT_DELETE.column.sql,
    queryDefaultPredicate: SOFT_DELETE_FILTER.predicateWhenApplies,
    indexingPartialPredicate: UNIQUE_BUSINESS_KEYS.softDeletePartialPredicate,
    auditImplementationAdr: AUDIT_TRAIL_PORT.implementationAdr,
  },
} as const;
