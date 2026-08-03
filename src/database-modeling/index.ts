/**
 * ADR-043 — Database Modeling Standards contract.
 *
 * Query-first OLTP modeling for PostgreSQL + Drizzle. Schema files must follow
 * these rules; concrete domain tables land with domain ADRs. Indexing → ADR-044.
 *
 * Normative prose: docs/architecture/data-modeling-guidelines.md
 */

import {
  MODULE_BOUNDARY_RULES,
  assertDomainMayNotJoinModules,
} from "../modular-monolith/index.js";
import {
  TENANT_ISOLATION_EXPECTATIONS,
  UNIVERSAL_COLUMN_EXPECTATIONS,
  UTF8_PERSIAN_TEXT,
} from "../postgresql-architecture/index.js";
import { IRANIAN_FIRST_TEXT_COLUMNS } from "../drizzle-orm-strategy/index.js";

/** Tables: snake_case plural. Columns: snake_case. */
export const TABLE_NAMING = {
  style: "snake_case",
  tableNumber: "plural",
  columnStyle: "snake_case",
  booleanPrefix: "is_",
  timestampSuffix: "_at",
  examples: ["sale_lines", "stock_items", "store_memberships"] as const,
} as const;

/** UUID primary keys — never serial ints for public/tenant resources. */
export const PRIMARY_KEY = {
  sql: UNIVERSAL_COLUMN_EXPECTATIONS.primaryKey.sql,
  type: UNIVERSAL_COLUMN_EXPECTATIONS.primaryKey.type,
  generatedIn: UNIVERSAL_COLUMN_EXPECTATIONS.primaryKey.generatedIn,
  forbidden: ["serial", "bigserial", "identity_int"] as const,
} as const;

/** Audit timestamps: timestamptz, stored UTC. */
export const AUDIT_TIMESTAMPS = {
  createdAt: UNIVERSAL_COLUMN_EXPECTATIONS.timestamps.createdAt,
  updatedAt: UNIVERSAL_COLUMN_EXPECTATIONS.timestamps.updatedAt,
  storageTimezone: UNIVERSAL_COLUMN_EXPECTATIONS.timestamps.storageTimezone,
  displayTimezone: UNIVERSAL_COLUMN_EXPECTATIONS.timestamps.displayTimezone,
  requiredOnEveryTable: true,
} as const;

/**
 * Soft delete is optional per table, but when used must follow this shape.
 * Deeper integrity rules (required when auditable/membership, hard-delete policy,
 * AuditPort) → `src/data-integrity` (ADR-047).
 */
export const SOFT_DELETE = {
  optional: true,
  column: UNIVERSAL_COLUMN_EXPECTATIONS.softDelete.column,
  defaultReadsExcludeDeleted: true,
  partialUniquesWhenSoftDelete: true,
  detailAdr: UNIVERSAL_COLUMN_EXPECTATIONS.softDelete.detailAdr,
  detailModule: "src/data-integrity",
} as const;

/** Tenant discriminator on merchant-owned tables. Detail isolation → ADR-048. */
export const TENANT_COLUMN = {
  ...TENANT_ISOLATION_EXPECTATIONS.tenantColumn,
  requiredOnTenantTables: true,
  uniquesMustIncludeMerchantId: true,
  detailAdr: TENANT_ISOLATION_EXPECTATIONS.detailAdr,
  detailModule: TENANT_ISOLATION_EXPECTATIONS.detailModule,
} as const;

/**
 * Persian UTF-8 text — product names, notes, addresses.
 * Prefer text/varchar; never ASCII-only collations.
 */
export const PERSIAN_TEXT_COLUMNS = {
  encoding: UTF8_PERSIAN_TEXT.encoding,
  supportsPersianText: UTF8_PERSIAN_TEXT.supportsPersianText,
  asciiOnlyCollationsForbidden: UTF8_PERSIAN_TEXT.asciiOnlyCollationsForbidden,
  preferredTypes: IRANIAN_FIRST_TEXT_COLUMNS.preferredTypes,
  searchPlansConsiderPersian: UTF8_PERSIAN_TEXT.searchPlansConsiderPersian,
} as const;

/**
 * Money in OLTP: integer minor units of IRR (rial).
 * Display تومان is presentation / Money VO — not a float column.
 */
export const MONEY_COLUMNS = {
  storage: "integer_minor_units",
  currency: "IRR",
  typeSql: "bigint",
  nonNegativeCheck: true,
  forbidFloatOrDouble: true,
  displayUnitDeferredTo: "presentation_layer",
  displayDefault: "toman",
} as const;

/** Optimistic locking where concurrent writers exist (inventory, wallet, sync). */
export const OPTIMISTIC_LOCK = {
  columnSql: "version",
  typeSql: "integer",
  notNullDefault: 1,
  when: "concurrent_writers",
  requiredCandidates: ["stock_items", "wallets", "offline_sale_sync_targets"] as const,
} as const;

/**
 * Domain must not join tables owned by other modules (ADR-004).
 * Compose in application / events; cross-context refs may be UUID without FK when purity demands.
 */
export const CROSS_MODULE_JOINS = {
  allowedInDomain: false,
  compositionLayer: MODULE_BOUNDARY_RULES.compositionLayer,
  publishedLanguage: MODULE_BOUNDARY_RULES.publishedLanguage,
  referenceAdr: "ADR-004",
  alignsWithModuleBoundary:
    MODULE_BOUNDARY_RULES.noCrossModuleDbJoinsInDomain === true,
} as const;

/** Aggregates map to tables; design query-first with growth estimates in ARDs. */
export const MODELING_PRACTICE = {
  queryFirst: true,
  aggregatesMapToTables: true,
  estimateRowsAtMerchantTiers: [10, 500, 5_000, 50_000] as const,
  fksExplicitAndIndexed: true,
  checksRequiredForMoneyQtyStatus: true,
  ardDatabaseDesignSectionMandatory: true,
  guidelinesDoc: "docs/architecture/data-modeling-guidelines.md",
} as const;

export const DATABASE_MODELING_REQUIREMENTS = {
  snakeCasePluralTables: true,
  uuidPrimaryKeys: true,
  createdAtUpdatedAtTimestamptzUtc: true,
  softDeleteDeletedAtOptional: true,
  merchantIdOnTenantTables: true,
  utf8PersianTextColumns: true,
  moneyIntegerMinorUnitsIrr: true,
  noCrossModuleJoinsInDomain: true,
  optimisticVersionWhenConcurrent: true,
  noDomainTablesInThisAdr: true,
  indexingDeferredAdr: "ADR-044",
} as const;

const SNAKE_CASE_TABLE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

/**
 * Accepts snake_case plural table names (multi-word preferred; short plurals like
 * `sales` allowed when ending with a conventional plural form).
 */
export function assertSnakeCasePluralTableName(tableName: string): void {
  if (!SNAKE_CASE_TABLE.test(tableName)) {
    throw new Error(
      `Table name must be snake_case (ADR-043); got "${tableName}".`,
    );
  }
  const lastSegment = tableName.split("_").at(-1) ?? "";
  const looksPlural =
    lastSegment.endsWith("s") ||
    lastSegment.endsWith("ies") ||
    lastSegment === "data" ||
    lastSegment === "media";
  if (!looksPlural) {
    throw new Error(
      `Table name must be plural snake_case (ADR-043); got "${tableName}".`,
    );
  }
}

export function assertUuidPrimaryKey(pkType: string): void {
  if (pkType !== PRIMARY_KEY.type) {
    throw new Error(
      `OLTP primary keys must be UUID (ADR-043); got "${pkType}".`,
    );
  }
}

export function assertAuditTimestampsUtc(storageTimezone: string): void {
  if (storageTimezone !== "UTC") {
    throw new Error(
      `Audit timestamps must store UTC (ADR-043 Iranian First); got "${storageTimezone}".`,
    );
  }
  if (AUDIT_TIMESTAMPS.createdAt.type !== "timestamptz") {
    throw new Error("created_at must be timestamptz (ADR-043).");
  }
  if (AUDIT_TIMESTAMPS.updatedAt.type !== "timestamptz") {
    throw new Error("updated_at must be timestamptz (ADR-043).");
  }
}

export function assertSoftDeleteColumnOptional(usesSoftDelete: boolean): void {
  if (!usesSoftDelete) {
    return;
  }
  if (SOFT_DELETE.column.sql !== "deleted_at") {
    throw new Error('Soft-delete SQL column must be "deleted_at" (ADR-043).');
  }
  if (SOFT_DELETE.column.type !== "timestamptz") {
    throw new Error("deleted_at must be timestamptz (ADR-043).");
  }
  if (!SOFT_DELETE.column.nullable) {
    throw new Error("deleted_at must be nullable (ADR-043).");
  }
}

export function assertMerchantIdOnTenantTable(
  isTenantTable: boolean,
  columnSql: string | null,
): void {
  if (!isTenantTable) {
    return;
  }
  if (columnSql !== TENANT_COLUMN.sql) {
    throw new Error(
      `Tenant tables require "${TENANT_COLUMN.sql}" (ADR-043); got "${columnSql}".`,
    );
  }
}

export function assertUtf8PersianTextColumn(
  encoding: string,
  columnType: string,
): void {
  if (encoding.toUpperCase() !== "UTF8" && encoding.toUpperCase() !== "UTF-8") {
    throw new Error(
      `Text encoding must be UTF-8 for Persian (ADR-043 Iranian First); got "${encoding}".`,
    );
  }
  const allowed = PERSIAN_TEXT_COLUMNS.preferredTypes as readonly string[];
  if (!allowed.includes(columnType)) {
    throw new Error(
      `Persian text columns must use text/varchar (ADR-043); got "${columnType}".`,
    );
  }
  if (!PERSIAN_TEXT_COLUMNS.supportsPersianText) {
    throw new Error("Persian text support must remain enabled (ADR-043).");
  }
}

export function assertMoneyIntegerMinorUnits(
  storage: string,
  currency: string,
): void {
  if (storage !== MONEY_COLUMNS.storage) {
    throw new Error(
      `Money must be integer minor units (ADR-043); got "${storage}".`,
    );
  }
  if (currency !== MONEY_COLUMNS.currency) {
    throw new Error(
      `OLTP money currency must be IRR (ADR-043); got "${currency}".`,
    );
  }
}

export function assertNoCrossModuleDomainJoin(
  owningModule: string,
  joinedModule: string,
): void {
  if (CROSS_MODULE_JOINS.allowedInDomain) {
    throw new Error(
      "CROSS_MODULE_JOINS.allowedInDomain must be false (ADR-043 / ADR-004).",
    );
  }
  assertDomainMayNotJoinModules(owningModule, joinedModule);
}

export function assertOptimisticVersionWhenConcurrent(
  hasConcurrentWriters: boolean,
  hasVersionColumn: boolean,
): void {
  if (hasConcurrentWriters && !hasVersionColumn) {
    throw new Error(
      'Tables with concurrent writers require a "version" column (ADR-043).',
    );
  }
}

export const DATABASE_MODELING = {
  naming: TABLE_NAMING,
  primaryKey: PRIMARY_KEY,
  auditTimestamps: AUDIT_TIMESTAMPS,
  softDelete: SOFT_DELETE,
  tenantColumn: TENANT_COLUMN,
  persianTextColumns: PERSIAN_TEXT_COLUMNS,
  moneyColumns: MONEY_COLUMNS,
  optimisticLock: OPTIMISTIC_LOCK,
  crossModuleJoins: CROSS_MODULE_JOINS,
  practice: MODELING_PRACTICE,
  requirements: DATABASE_MODELING_REQUIREMENTS,
  alignsWith: {
    postgresqlPrimaryKey: UNIVERSAL_COLUMN_EXPECTATIONS.primaryKey.type,
    postgresqlTenantColumn: TENANT_ISOLATION_EXPECTATIONS.tenantColumn.sql,
    drizzlePersianTextTypes: IRANIAN_FIRST_TEXT_COLUMNS.preferredTypes,
    modularMonolithNoCrossJoins:
      MODULE_BOUNDARY_RULES.noCrossModuleDbJoinsInDomain,
  },
} as const;
