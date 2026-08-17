/**
 * ADR-044 — Indexing Standards contract.
 *
 * Explicit OLTP indexes for PostgreSQL + Drizzle. Concrete index DDL lands with
 * domain ADRs / migrations; query shape → ADR-045; barcode & fuzzy Persian
 * search implementation → ADR-050 (`src/modules/catalog/domain/search-barcode`).
 *
 * Normative prose: docs/architecture/indexing-strategy.md
 */

import {
  SOFT_DELETE,
  TENANT_COLUMN,
  PERSIAN_TEXT_COLUMNS,
  DATABASE_MODELING_REQUIREMENTS,
} from "../modeling/index.js";

/** Never rely on ORM-generated indexes alone. */
export const INDEX_AUTHORSHIP = {
  ormDefaultsInsufficient: true,
  explicitInDrizzleSchemaAndMigrations: true,
  purposeDocumentedPerIndex: true,
  strategyDoc: "docs/architecture/indexing-strategy.md",
} as const;

/**
 * Tenant composites: merchant_id is always the leftmost column.
 * Aligns with ADR-043 TENANT_COLUMN.
 */
export const TENANT_COMPOSITE_INDEXES = {
  leftmostColumnSql: TENANT_COLUMN.sql,
  requiredOnTenantTables: true,
  examples: [
    "(merchant_id, created_at DESC)",
    "(merchant_id, barcode)",
    "(merchant_id, phone)",
  ] as const,
  forbidStandaloneMerchantIdAsSoleHotIndex: true,
} as const;

/** Every FK column used in joins / cascades must be indexed. */
export const FOREIGN_KEY_INDEXES = {
  indexEveryFkUsedInJoinsOrCascades: true,
  examples: ["(sale_id)", "(order_id)", "(category_id)"] as const,
} as const;

/**
 * Unique business keys are tenant-scoped. Soft-delete tables use partial uniques
 * so a key may be reused after soft delete.
 */
export const UNIQUE_BUSINESS_KEYS = {
  mustIncludeMerchantId: TENANT_COLUMN.uniquesMustIncludeMerchantId,
  softDeletePartialPredicate: "deleted_at IS NULL",
  softDeletePartialRequiredWhenSoftDelete: SOFT_DELETE.partialUniquesWhenSoftDelete,
  examples: [
    "UNIQUE (merchant_id, phone) WHERE deleted_at IS NULL",
    "UNIQUE (merchant_id, barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL",
    "UNIQUE (merchant_id, sku) WHERE sku IS NOT NULL AND deleted_at IS NULL",
  ] as const,
  forbidGlobalUniqueOnPhone: true,
} as const;

/** Partial indexes for hot subsets (soft-delete aware and status filters). */
export const PARTIAL_INDEXES = {
  softDeleteAware: true,
  defaultActivePredicate: "deleted_at IS NULL",
  statusSubsetExample: "WHERE status = 'open'",
  alignsWithModelingSoftDelete: SOFT_DELETE.partialUniquesWhenSoftDelete,
} as const;

/**
 * Covering indexes (INCLUDE) only when column width / hot path justifies.
 * Always document why.
 */
export const COVERING_INDEXES = {
  allowedWhenJustified: true,
  requireJustification: true,
  examples: [
    "barcode resolve INCLUDE (product_id, name, price_amount, is_active)",
    "phone resolve INCLUDE (customer_id, segment)",
  ] as const,
} as const;

/** Avoid indexes that duplicate a composite's left-prefix without a distinct query need. */
export const REDUNDANT_INDEXES = {
  forbidLeftPrefixDuplicates: true,
  antiPatterns: [
    "duplicate (merchant_id, created_at) and (created_at) without need",
    "indexing merchant_id alone on huge tables as the sole hot path",
    "skipping partial deleted_at IS NULL on uniqueness",
  ] as const,
} as const;

/**
 * Persian / UTF-8 text indexing considerations (high-level).
 * Concrete barcode + fuzzy name search (pg_trgm GIN) detail → ADR-050 / src/search-barcode.
 */
export const PERSIAN_TEXT_INDEXING = {
  encoding: PERSIAN_TEXT_COLUMNS.encoding,
  supportsPersianText: PERSIAN_TEXT_COLUMNS.supportsPersianText,
  asciiOnlyCollationsForbidden: PERSIAN_TEXT_COLUMNS.asciiOnlyCollationsForbidden,
  avoidCaseFoldingThatBreaksPersian: true,
  searchPlansConsiderPersian: PERSIAN_TEXT_COLUMNS.searchPlansConsiderPersian,
  barcodeAndFuzzySearchDeferredAdr: "ADR-050",
  implementationPackage: "src/modules/catalog/domain/search-barcode",
  note: "UTF-8 fa product/customer text remains indexable; barcode equality B-tree + lightweight Persian normalize + pg_trgm path → ADR-050 (`src/modules/catalog/domain/search-barcode`).",
} as const;

/** Staging / ops: EXPLAIN hot POS/CRM paths before promoting index changes. */
export const INDEX_REVIEW_GATE = {
  explainHotPathsInStaging: true,
  ardMustListPurposeQuerySelectivity: true,
  writeAmplificationMeasured: true,
  hotPaths: ["pos_barcode", "pos_phone", "crm_attach", "pickup_status"] as const,
} as const;

export const INDEXING_REQUIREMENTS = {
  explicitIndexesNotOrmDefaultsAlone: true,
  merchantIdLeftmostOnTenantComposites: true,
  foreignKeysIndexedWhenJoined: true,
  uniqueBusinessKeysTenantScoped: true,
  softDeleteAwarePartialUniques: true,
  coveringOnlyWhenJustified: true,
  noRedundantLeftPrefixIndexes: true,
  documentWhyPerIndex: true,
  persianUtf8TextIndexConsiderations: true,
  barcodeSearchDeferredAdr: "ADR-050",
  queryDesignDeferredAdr: "ADR-045",
  noConcreteIndexDdlInThisAdr: true,
  alignsWithModelingIndexingDeferral:
    DATABASE_MODELING_REQUIREMENTS.indexingDeferredAdr === "ADR-044",
} as const;

export function assertMerchantIdLeftmost(
  columns: readonly string[],
): void {
  if (columns.length === 0) {
    throw new Error(
      "Tenant composite index must include columns (ADR-044).",
    );
  }
  if (columns[0] !== TENANT_COMPOSITE_INDEXES.leftmostColumnSql) {
    throw new Error(
      `Tenant composite indexes require "${TENANT_COMPOSITE_INDEXES.leftmostColumnSql}" leftmost (ADR-044); got "${columns[0]}".`,
    );
  }
}

export function assertForeignKeyIndexed(
  fkUsedInJoinOrCascade: boolean,
  hasIndex: boolean,
): void {
  if (fkUsedInJoinOrCascade && !hasIndex) {
    throw new Error(
      "FK columns used in joins/cascades must be indexed (ADR-044).",
    );
  }
}

export function assertUniqueBusinessKeyTenantScoped(
  uniqueColumns: readonly string[],
  usesSoftDelete: boolean,
  partialPredicate: string | null,
): void {
  if (!uniqueColumns.includes(TENANT_COLUMN.sql)) {
    throw new Error(
      `Unique business keys must include "${TENANT_COLUMN.sql}" (ADR-044).`,
    );
  }
  if (usesSoftDelete) {
    if (
      partialPredicate !== UNIQUE_BUSINESS_KEYS.softDeletePartialPredicate &&
      !(
        partialPredicate?.includes("deleted_at IS NULL") ??
        false
      )
    ) {
      throw new Error(
        'Soft-delete unique keys require partial predicate including "deleted_at IS NULL" (ADR-044).',
      );
    }
  }
}

export function assertNoRedundantLeftPrefix(
  proposedColumns: readonly string[],
  existingCompositeColumns: readonly string[],
): void {
  if (proposedColumns.length === 0) {
    throw new Error("Proposed index columns must be non-empty (ADR-044).");
  }
  const isLeftPrefix =
    proposedColumns.length < existingCompositeColumns.length &&
    proposedColumns.every((col, i) => col === existingCompositeColumns[i]);
  if (isLeftPrefix) {
    throw new Error(
      "Redundant left-prefix index of an existing composite is forbidden (ADR-044).",
    );
  }
}

export function assertCoveringJustified(
  usesInclude: boolean,
  justified: boolean,
  whyDocumented: boolean,
): void {
  if (!usesInclude) {
    return;
  }
  if (!justified) {
    throw new Error(
      "Covering INCLUDE indexes require hot-path justification (ADR-044).",
    );
  }
  if (!whyDocumented) {
    throw new Error(
      "Every covering index must document why (ADR-044).",
    );
  }
}

export function assertIndexPurposeDocumented(purpose: string): void {
  if (purpose.trim().length === 0) {
    throw new Error("Every index must document its purpose (ADR-044).");
  }
}

export function assertPersianTextIndexConsiderations(
  encoding: string,
  asciiOnlyCollation: boolean,
): void {
  if (
    encoding.toUpperCase() !== "UTF8" &&
    encoding.toUpperCase() !== "UTF-8"
  ) {
    throw new Error(
      `Indexed text encoding must be UTF-8 for Persian (ADR-044 Iranian First); got "${encoding}".`,
    );
  }
  if (asciiOnlyCollation) {
    throw new Error(
      "ASCII-only collations are forbidden on Persian-indexed text (ADR-044).",
    );
  }
  if (!PERSIAN_TEXT_INDEXING.searchPlansConsiderPersian) {
    throw new Error(
      "Persian search considerations must remain enabled (ADR-044).",
    );
  }
}

export function assertBarcodeSearchDeferred(detailAdr: string): void {
  if (detailAdr !== PERSIAN_TEXT_INDEXING.barcodeAndFuzzySearchDeferredAdr) {
    throw new Error(
      `Barcode/fuzzy Persian search detail is deferred to ${PERSIAN_TEXT_INDEXING.barcodeAndFuzzySearchDeferredAdr} (ADR-044); got "${detailAdr}".`,
    );
  }
}

export const INDEXING_STANDARDS = {
  authorship: INDEX_AUTHORSHIP,
  tenantComposites: TENANT_COMPOSITE_INDEXES,
  foreignKeys: FOREIGN_KEY_INDEXES,
  uniqueBusinessKeys: UNIQUE_BUSINESS_KEYS,
  partialIndexes: PARTIAL_INDEXES,
  coveringIndexes: COVERING_INDEXES,
  redundantIndexes: REDUNDANT_INDEXES,
  persianTextIndexing: PERSIAN_TEXT_INDEXING,
  reviewGate: INDEX_REVIEW_GATE,
  requirements: INDEXING_REQUIREMENTS,
  alignsWith: {
    tenantColumnSql: TENANT_COLUMN.sql,
    softDeleteColumn: SOFT_DELETE.column.sql,
    modelingIndexingDeferral: DATABASE_MODELING_REQUIREMENTS.indexingDeferredAdr,
    persianEncoding: PERSIAN_TEXT_COLUMNS.encoding,
  },
} as const;
