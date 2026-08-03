import { describe, expect, it } from "vitest";

import {
  AUDIT_TIMESTAMPS,
  OPTIMISTIC_LOCK,
  SOFT_DELETE as MODELING_SOFT_DELETE,
} from "../database-modeling/index.js";
import { UNIQUE_BUSINESS_KEYS } from "../indexing-standards/index.js";
import { SOFT_DELETE_FILTER } from "../query-design-standards/index.js";
import { UTF8_PERSIAN_TEXT } from "../postgresql-architecture/index.js";

import {
  AUDIT_FIELDS,
  AUDIT_TRAIL_PORT,
  CREATED_BY,
  DATA_INTEGRITY,
  DATA_INTEGRITY_REQUIREMENTS,
  HARD_DELETE_POLICY,
  OPTIMISTIC_VERSION,
  PARTIAL_UNIQUES,
  PERSIAN_CONTENT_PRESERVATION,
  SOFT_DELETE,
  assertAuditPortContract,
  assertCreatedByOptional,
  assertDefaultReadsExcludeDeleted,
  assertMandatoryAuditTimestamps,
  assertNoHardDeleteWithoutPolicy,
  assertOptimisticVersion,
  assertPartialUniqueWhenSoftDelete,
  assertPersianContentPreserved,
  assertSoftDeleteRequired,
} from "./index.js";

describe("ADR-047 Data Integrity Soft Delete and Audit Fields", () => {
  it("requires soft-delete deleted_at for customer-visible, auditable, and membership entities", () => {
    expect(SOFT_DELETE.columnSql).toBe("deleted_at");
    expect(SOFT_DELETE.typeSql).toBe("timestamptz");
    expect(SOFT_DELETE.nullable).toBe(true);
    expect(SOFT_DELETE.defaultReadsExcludeDeleted).toBe(true);
    expect(SOFT_DELETE.defaultReadPredicate).toBe("deleted_at IS NULL");
    expect(SOFT_DELETE.supportsCrmRestore).toBe(true);
    expect(SOFT_DELETE.requiredEntityExamples).toEqual(
      expect.arrayContaining([
        "customers",
        "products",
        "stores",
        "store_memberships",
      ]),
    );
    expect(DATA_INTEGRITY_REQUIREMENTS.softDeleteDeletedAt).toBe(true);
    expect(SOFT_DELETE.columnSql).toBe(MODELING_SOFT_DELETE.column.sql);
    expect(SOFT_DELETE.defaultReadPredicate).toBe(
      SOFT_DELETE_FILTER.predicateWhenApplies,
    );

    expect(() => assertSoftDeleteRequired("customer_visible")).not.toThrow();
    expect(() => assertSoftDeleteRequired("auditable")).not.toThrow();
    expect(() => assertSoftDeleteRequired("membership")).not.toThrow();
    expect(() => assertSoftDeleteRequired("ephemeral_system")).not.toThrow();

    expect(() =>
      assertDefaultReadsExcludeDeleted(true, true),
    ).not.toThrow();
    expect(() =>
      assertDefaultReadsExcludeDeleted(true, false),
    ).toThrow(/deleted_at IS NULL/i);
    expect(() =>
      assertDefaultReadsExcludeDeleted(false, false),
    ).not.toThrow();
  });

  it("requires created_at and updated_at timestamptz stored in UTC", () => {
    expect(AUDIT_FIELDS.createdAt.sql).toBe("created_at");
    expect(AUDIT_FIELDS.updatedAt.sql).toBe("updated_at");
    expect(AUDIT_FIELDS.createdAt.type).toBe("timestamptz");
    expect(AUDIT_FIELDS.updatedAt.type).toBe("timestamptz");
    expect(AUDIT_FIELDS.storageTimezone).toBe("UTC");
    expect(AUDIT_FIELDS.displayTimezone).toBe("Asia/Tehran");
    expect(AUDIT_FIELDS.requiredOnEveryTable).toBe(true);
    expect(DATA_INTEGRITY_REQUIREMENTS.createdAtUpdatedAtMandatory).toBe(true);
    expect(AUDIT_FIELDS.createdAt).toBe(AUDIT_TIMESTAMPS.createdAt);

    expect(() =>
      assertMandatoryAuditTimestamps({
        hasCreatedAt: true,
        hasUpdatedAt: true,
        storageTimezone: "UTC",
      }),
    ).not.toThrow();
    expect(() =>
      assertMandatoryAuditTimestamps({
        hasCreatedAt: false,
        hasUpdatedAt: true,
        storageTimezone: "UTC",
      }),
    ).toThrow(/created_at and updated_at/i);
    expect(() =>
      assertMandatoryAuditTimestamps({
        hasCreatedAt: true,
        hasUpdatedAt: true,
        storageTimezone: "Asia/Tehran",
      }),
    ).toThrow(/UTC/i);
  });

  it("allows optional created_by uuid without replacing AuditPort", () => {
    expect(CREATED_BY.optional).toBe(true);
    expect(CREATED_BY.columnSql).toBe("created_by");
    expect(CREATED_BY.typeSql).toBe("uuid");
    expect(CREATED_BY.nullable).toBe(true);
    expect(CREATED_BY.doesNotReplaceAuditPort).toBe(true);
    expect(DATA_INTEGRITY_REQUIREMENTS.createdByOptional).toBe(true);

    expect(() =>
      assertCreatedByOptional({ includesCreatedBy: false }),
    ).not.toThrow();
    expect(() =>
      assertCreatedByOptional({ includesCreatedBy: true, typeSql: "uuid" }),
    ).not.toThrow();
    expect(() =>
      assertCreatedByOptional({ includesCreatedBy: true, typeSql: "text" }),
    ).toThrow(/uuid/i);
  });

  it("requires optimistic version when concurrent writers exist", () => {
    expect(OPTIMISTIC_VERSION.columnSql).toBe("version");
    expect(OPTIMISTIC_VERSION.typeSql).toBe("integer");
    expect(OPTIMISTIC_VERSION.notNullDefault).toBe(1);
    expect(OPTIMISTIC_VERSION.requiredCandidates).toEqual(
      OPTIMISTIC_LOCK.requiredCandidates,
    );
    expect(DATA_INTEGRITY_REQUIREMENTS.optimisticVersionWhenConcurrent).toBe(
      true,
    );

    expect(() => assertOptimisticVersion(true, true)).not.toThrow();
    expect(() => assertOptimisticVersion(true, false)).toThrow(/version/i);
    expect(() => assertOptimisticVersion(false, false)).not.toThrow();
  });

  it("requires partial uniques with deleted_at IS NULL when soft delete applies", () => {
    expect(PARTIAL_UNIQUES.requiredWhenSoftDelete).toBe(true);
    expect(PARTIAL_UNIQUES.predicate).toBe("deleted_at IS NULL");
    expect(PARTIAL_UNIQUES.alignsWithIndexing).toBe(true);
    expect(PARTIAL_UNIQUES.predicate).toBe(
      UNIQUE_BUSINESS_KEYS.softDeletePartialPredicate,
    );
    expect(DATA_INTEGRITY_REQUIREMENTS.partialUniquesWhenSoftDelete).toBe(
      true,
    );

    expect(() =>
      assertPartialUniqueWhenSoftDelete({
        usesSoftDelete: true,
        uniquePredicate: "WHERE deleted_at IS NULL",
      }),
    ).not.toThrow();
    expect(() =>
      assertPartialUniqueWhenSoftDelete({
        usesSoftDelete: true,
        uniquePredicate: null,
      }),
    ).toThrow(/deleted_at IS NULL/i);
    expect(() =>
      assertPartialUniqueWhenSoftDelete({ usesSoftDelete: false }),
    ).not.toThrow();
  });

  it("forbids hard-delete of memberships and auditable data without retention policy", () => {
    expect(HARD_DELETE_POLICY.forbidHardDeleteAuditableInMvp).toBe(true);
    expect(HARD_DELETE_POLICY.forbidHardDeleteMembershipsWithoutPolicy).toBe(
      true,
    );
    expect(HARD_DELETE_POLICY.membershipTable).toBe("store_memberships");
    expect(HARD_DELETE_POLICY.preferSoftDelete).toBe(true);
    expect(
      DATA_INTEGRITY_REQUIREMENTS.noHardDeleteMembershipsWithoutPolicy,
    ).toBe(true);
    expect(DATA_INTEGRITY_REQUIREMENTS.noHardDeleteAuditableWithoutPolicy).toBe(
      true,
    );

    expect(() =>
      assertNoHardDeleteWithoutPolicy({
        entity: "store_memberships",
        isHardDelete: true,
        hasRetentionPurgePolicy: false,
      }),
    ).toThrow(/retention\/purge policy/i);
    expect(() =>
      assertNoHardDeleteWithoutPolicy({
        entity: "customers",
        isHardDelete: true,
        hasRetentionPurgePolicy: false,
        isAuditable: true,
      }),
    ).toThrow(/retention\/purge policy/i);
    expect(() =>
      assertNoHardDeleteWithoutPolicy({
        entity: "store_memberships",
        isHardDelete: true,
        hasRetentionPurgePolicy: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertNoHardDeleteWithoutPolicy({
        entity: "store_memberships",
        isHardDelete: false,
        hasRetentionPurgePolicy: false,
      }),
    ).not.toThrow();
  });

  it("defines AuditPort insert-only with Mongo mos_audit implemented in ADR-058", () => {
    expect(AUDIT_TRAIL_PORT.portName).toBe("AuditPort");
    expect(AUDIT_TRAIL_PORT.insertOnly).toBe(true);
    expect(AUDIT_TRAIL_PORT.forbidUpdateApi).toBe(true);
    expect(AUDIT_TRAIL_PORT.forbidDeleteApi).toBe(true);
    expect(AUDIT_TRAIL_PORT.primaryDestination).toBe("mongodb_mos_audit");
    expect(AUDIT_TRAIL_PORT.implementationAdr).toBe("ADR-058");
    expect(AUDIT_TRAIL_PORT.implementationPackage).toBe("src/audit-logging/");
    expect(AUDIT_TRAIL_PORT.optionalThinPgTable).toBe("audit_logs");
    expect(DATA_INTEGRITY_REQUIREMENTS.auditPortDeferredToAdr058).toBe(false);
    expect(DATA_INTEGRITY_REQUIREMENTS.auditPortImplementedAdr058).toBe(true);
    expect(AUDIT_TRAIL_PORT.requiredFields).toEqual(
      expect.arrayContaining([
        "eventId",
        "merchantId",
        "actorId",
        "action",
        "correlationId",
      ]),
    );

    expect(() =>
      assertAuditPortContract({
        insertOnly: true,
        allowsUpdate: false,
        allowsDelete: false,
        primaryDestination: "mongodb_mos_audit",
        implementationAdr: "ADR-058",
      }),
    ).not.toThrow();
    expect(() =>
      assertAuditPortContract({
        insertOnly: false,
        allowsUpdate: true,
        allowsDelete: false,
        primaryDestination: "mongodb_mos_audit",
        implementationAdr: "ADR-058",
      }),
    ).toThrow(/insert-only/i);
    expect(() =>
      assertAuditPortContract({
        insertOnly: true,
        allowsUpdate: false,
        allowsDelete: false,
        primaryDestination: "postgresql_only",
        implementationAdr: "ADR-058",
      }),
    ).toThrow(/mongodb_mos_audit/i);
    expect(() =>
      assertAuditPortContract({
        insertOnly: true,
        allowsUpdate: false,
        allowsDelete: false,
        primaryDestination: "mongodb_mos_audit",
        implementationAdr: "ADR-047",
      }),
    ).toThrow(/ADR-058/i);
  });

  it("preserves Persian UTF-8 content in soft-deleted rows and audit summaries", () => {
    expect(PERSIAN_CONTENT_PRESERVATION.encoding).toBe(
      UTF8_PERSIAN_TEXT.encoding,
    );
    expect(PERSIAN_CONTENT_PRESERVATION.preserveFaInSoftDeletedRows).toBe(true);
    expect(PERSIAN_CONTENT_PRESERVATION.preserveFaInAuditSummaries).toBe(true);
    expect(
      PERSIAN_CONTENT_PRESERVATION.forbidAsciiScrubOfFaAuditPayload,
    ).toBe(true);
    expect(
      DATA_INTEGRITY_REQUIREMENTS.preservePersianUtf8InAuditAndSoftDelete,
    ).toBe(true);

    expect(() => assertPersianContentPreserved({})).not.toThrow();
    expect(() =>
      assertPersianContentPreserved({ encoding: "UTF8" }),
    ).not.toThrow();
    expect(() =>
      assertPersianContentPreserved({ encoding: "LATIN1" }),
    ).toThrow(/UTF-8/i);
    expect(() =>
      assertPersianContentPreserved({ asciiScrubsFaAuditPayload: true }),
    ).toThrow(/ASCII-scrub/i);
    expect(() =>
      assertPersianContentPreserved({ dropsFaOnSoftDelete: true }),
    ).toThrow(/Soft delete/i);
  });

  it("aggregates the data-integrity strategy and points purge to ADR-064", () => {
    expect(SOFT_DELETE.purgeJobsDeferred).toBe(true);
    expect(SOFT_DELETE.purgePolicyAdr).toBe("ADR-064");
    expect(SOFT_DELETE.purgePolicyPackage).toBe("src/data-retention/");
    expect(DATA_INTEGRITY_REQUIREMENTS.purgeJobsFuture).toBe(true);
    expect(DATA_INTEGRITY_REQUIREMENTS.noDomainTablesInThisAdr).toBe(true);
    expect(DATA_INTEGRITY.softDelete).toBe(SOFT_DELETE);
    expect(DATA_INTEGRITY.auditFields).toBe(AUDIT_FIELDS);
    expect(DATA_INTEGRITY.auditTrailPort).toBe(AUDIT_TRAIL_PORT);
    expect(DATA_INTEGRITY.requirements).toBe(DATA_INTEGRITY_REQUIREMENTS);
    expect(DATA_INTEGRITY.alignsWith.modelingSoftDeleteColumn).toBe(
      "deleted_at",
    );
    expect(DATA_INTEGRITY.alignsWith.auditImplementationAdr).toBe("ADR-058");
    expect(DATA_INTEGRITY.hardDeletePolicy.retentionPurgePolicyAdr).toBe(
      "ADR-064",
    );
  });
});
