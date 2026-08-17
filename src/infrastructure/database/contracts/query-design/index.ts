/**
 * ADR-045 — Query Design Standards contract.
 *
 * Query-first OLTP access for PostgreSQL + Drizzle. Concrete repositories and
 * list endpoints land with domain ADRs; migrations → `src/infrastructure/database/contracts/migration-strategy`
 * (ADR-046); soft-delete / audit integrity → `src/infrastructure/database/contracts/data-integrity` (ADR-047);
 * multi-tenant isolation deepen → `src/shared/contracts/multi-tenant-isolation` (ADR-048);
 * barcode/fuzzy search → ADR-050 (`src/modules/catalog/domain/search-barcode`); cache-aside helpers → ADR-052 (`src/infrastructure/redis/cache-aside`). *
 * Normative prose: docs/architecture/query-strategy.md
 */

import {
  AUDIT_TIMESTAMPS,
  SOFT_DELETE,
  TENANT_COLUMN,
  PERSIAN_TEXT_COLUMNS,
  assertNoCrossModuleDomainJoin,
} from "../modeling/index.js";
import { MODULE_BOUNDARY_RULES } from "../../../../shared/contracts/modular-monolith/index.js";
import { DRIZZLE_LAYERING } from "../drizzle-strategy/index.js";
import { INDEXING_REQUIREMENTS } from "../indexing/index.js";

/** Normative strategy document. */
export const QUERY_STRATEGY_DOC = "docs/architecture/query-strategy.md" as const;

/**
 * Every tenant OLTP query must filter merchant_id.
 * AuthZ: never accept merchant_id solely from the client without matching JWT claim.
 */
export const TENANT_FILTER = {
  columnSql: TENANT_COLUMN.sql,
  requiredOnEveryTenantQuery: true,
  mustMatchJwtClaim: true,
  forbidClientOnlyMerchantId: true,
  examplePredicate: "WHERE merchant_id = $1",
  detailAdr: "ADR-048",
  detailModule: "src/shared/contracts/multi-tenant-isolation",
} as const;

/**
 * Soft-delete: default reads exclude deleted rows when the table uses soft delete.
 * Deeper integrity rules → `src/infrastructure/database/contracts/data-integrity` (ADR-047).
 */
export const SOFT_DELETE_FILTER = {
  columnSql: SOFT_DELETE.column.sql,
  defaultReadsExcludeDeleted: SOFT_DELETE.defaultReadsExcludeDeleted,
  predicateWhenApplies: "deleted_at IS NULL",
  detailAdr: SOFT_DELETE.detailAdr,
  detailModule: "src/infrastructure/database/contracts/data-integrity",
} as const;

/**
 * Pagination: keyset on hot/large lists; OFFSET only for small admin pages.
 * Never deep OFFSET on huge tables.
 */
export const PAGINATION = {
  preferredStrategy: "keyset",
  keysetCursorExample: "(created_at, id) < (:cursor_ts, :cursor_id)",
  keysetUseCases: [
    "pos_recent_sales",
    "crm_customer_lists",
    "orders_board",
  ] as const,
  offsetAllowedFor: "admin_small_pages",
  forbidDeepOffsetOnLargeTables: true,
  deepOffsetAntiPattern: "OFFSET deep pages on 50M-row tables",
} as const;

/** Explicit column projections — never SELECT *. */
export const PROJECTIONS = {
  forbidSelectStar: true,
  selectOnlyNeededColumns: true,
  listEndpointsMustProject: true,
  antiPattern: "SELECT *",
} as const;

/**
 * N+1 prevention: batch load or join; never query per row in a loop.
 */
export const N_PLUS_ONE = {
  forbidden: true,
  requiredPatterns: ["join", "batch_load", "inArray"] as const,
  antiPattern: "load sales then per-line product query in loop",
  cartHydrationExample: "inArray(product.id, ids)",
} as const;

/**
 * OLTP access only through repositories (ADR-029 / ADR-042).
 * No Drizzle in domain, UI, or ad-hoc route handlers.
 */
export const REPOSITORY_ACCESS = {
  oltpAccessViaRepositoriesOnly: true,
  domainMayImportDrizzle: DRIZZLE_LAYERING.domainMayImportDrizzle,
  uiMayImportDrizzle: DRIZZLE_LAYERING.uiMayImportDrizzle,
  forbidAdHocSelectInRouteHandlers: true,
  path: "use_case → repository → drizzle",
} as const;

/**
 * Cross-module: compose in application / events — no domain SQL joins across modules.
 */
export const CROSS_MODULE_COMPOSITION = {
  forbidDomainCrossModuleJoins:
    MODULE_BOUNDARY_RULES.noCrossModuleDbJoinsInDomain,
  composeIn: [
    MODULE_BOUNDARY_RULES.compositionLayer,
    MODULE_BOUNDARY_RULES.publishedLanguage,
  ] as const,
  alignsWithAdr004: true,
} as const;

/**
 * Aggregations / dashboards: no unbounded history aggregates on the request path.
 * Prefer projection tables + short Redis TTL.
 */
export const AGGREGATIONS = {
  forbidUnboundedAggregatesOnRequest: true,
  preferProjections: true,
  preferRedisBeforeDbForHotEntities: true,
  dashboardProjectionCacheTtlSeconds: 60,
  antiPattern: "SUM(sales) across unbounded history on request path",
} as const;

/**
 * Read vs write path separation.
 * CompleteSale is the canonical single-TX write boundary.
 */
export const READ_VS_WRITE = {
  separateReadAndWritePaths: true,
  completeSaleSingleTransaction: true,
  completeSaleIncludes: [
    "sale",
    "sale_lines",
    "stock",
    "customer_upsert",
    "loyalty",
    "outbox",
  ] as const,
  writeUsesDbTransaction: true,
  readPreferCacheThenIndexedQuery: true,
} as const;

/**
 * Iranian First — time & text at the query layer.
 * Store UTC timestamptz; present Asia/Tehran + Jalali in UI (not SQL).
 */
export const IRANIAN_QUERY_CONSIDERATIONS = {
  timestampStorageTimezone: AUDIT_TIMESTAMPS.storageTimezone,
  timestampDisplayTimezone: AUDIT_TIMESTAMPS.displayTimezone,
  displayConvertsToTehranAndJalali: true,
  persianUtf8TextSupported: PERSIAN_TEXT_COLUMNS.supportsPersianText,
  encoding: PERSIAN_TEXT_COLUMNS.encoding,
  searchPlansConsiderPersian: PERSIAN_TEXT_COLUMNS.searchPlansConsiderPersian,
  barcodeAndFuzzySearchDeferredAdr: "ADR-050",
  searchBarcodeImplementation: "src/modules/catalog/domain/search-barcode",
  uiRtlNAatSqlLayer: true,
} as const;

/** Staging: EXPLAIN hot-path queries before ARD Done. */
export const QUERY_REVIEW_GATE = {
  explainHotPathsInStaging: true,
  strategyDoc: QUERY_STRATEGY_DOC,
  hotPaths: [
    "pos_barcode",
    "pos_phone",
    "complete_sale",
    "crm_list",
    "storefront_catalog",
  ] as const,
  performanceBudgets: {
    barcodeResolveSecondsMax: 1,
    productSearchP95MsCached: 100,
    checkoutContributesSecondsMax: 5,
  },
} as const;

export const QUERY_DESIGN_REQUIREMENTS = {
  alwaysFilterMerchantId: true,
  merchantIdMustMatchJwtClaim: true,
  softDeleteDefaultExclude: true,
  keysetPaginationPreferred: true,
  forbidDeepOffset: true,
  forbidSelectStar: true,
  avoidNPlusOne: true,
  repositoriesOnlyForOltp: true,
  applicationCompositionNotCrossModuleJoins: true,
  separateReadAndWritePaths: true,
  completeSaleSingleTransaction: true,
  forbidUnboundedAggregatesOnRequest: true,
  preferRedisBeforeDbForHotEntities: true,
  utcStorageTehranDisplay: true,
  barcodeSearchDeferredAdr: "ADR-050",
  migrationStrategyAdr: "ADR-046",
  noConcreteRepositoryImplInThisAdr: true,
  alignsWithIndexingQueryDeferral:
    INDEXING_REQUIREMENTS.queryDesignDeferredAdr === "ADR-045",
  strategyDoc: QUERY_STRATEGY_DOC,
} as const;

export type TenantQueryFilterInput = {
  merchantId: string | null | undefined;
  jwtMerchantId: string | null | undefined;
  isTenantTable: boolean;
};

export function assertTenantFilter(input: TenantQueryFilterInput): void {
  if (!input.isTenantTable) {
    return;
  }
  if (input.merchantId == null || input.merchantId.trim() === "") {
    throw new Error(
      `Tenant queries require "${TENANT_FILTER.columnSql}" filter (ADR-045).`,
    );
  }
  if (input.jwtMerchantId == null || input.jwtMerchantId.trim() === "") {
    throw new Error(
      "Tenant queries require JWT merchant claim match (ADR-045 AuthZ).",
    );
  }
  if (input.merchantId !== input.jwtMerchantId) {
    throw new Error(
      "merchant_id filter must match JWT claim; client-only value forbidden (ADR-045).",
    );
  }
}

export function assertSoftDeleteDefaultExclude(
  usesSoftDelete: boolean,
  includesDeletedAtIsNull: boolean,
): void {
  if (usesSoftDelete && !includesDeletedAtIsNull) {
    throw new Error(
      'Default reads on soft-delete tables must include "deleted_at IS NULL" (ADR-045).',
    );
  }
}

export type PaginationStrategy = "keyset" | "offset";

export function assertPaginationStrategy(
  strategy: PaginationStrategy,
  options: { largeTable: boolean; adminSmallPage: boolean },
): void {
  if (strategy === "keyset") {
    return;
  }
  if (options.largeTable && !options.adminSmallPage) {
    throw new Error(
      "Deep OFFSET on large tables is forbidden; use keyset pagination (ADR-045).",
    );
  }
  if (!options.adminSmallPage) {
    throw new Error(
      "OFFSET is only acceptable for small admin pages; prefer keyset (ADR-045).",
    );
  }
}

export function assertNoSelectStar(selectsStar: boolean): void {
  if (selectsStar) {
    throw new Error(
      "SELECT * is forbidden; project only needed columns (ADR-045).",
    );
  }
}

export function assertNoNPlusOne(
  queriesPerParentRowInLoop: boolean,
  usesBatchOrJoin: boolean,
): void {
  if (queriesPerParentRowInLoop) {
    throw new Error(
      "N+1 queries are forbidden; use join or batch/inArray load (ADR-045).",
    );
  }
  if (!usesBatchOrJoin) {
    throw new Error(
      "List/hydration queries must use join or batch/inArray (ADR-045).",
    );
  }
}

export function assertOltpViaRepository(
  accessLayer: "repository" | "domain" | "ui" | "route_handler",
): void {
  if (accessLayer !== "repository") {
    throw new Error(
      "OLTP access must go through repositories only (ADR-045 / ADR-042).",
    );
  }
}

export function assertApplicationComposition(
  owningModule: string,
  joinedModule: string,
  composedInApplication: boolean,
): void {
  if (owningModule === joinedModule) {
    return;
  }
  if (!composedInApplication) {
    assertNoCrossModuleDomainJoin(owningModule, joinedModule);
  }
}

export function assertNoUnboundedAggregateOnRequest(
  isUnboundedHistoryAggregate: boolean,
  usesProjectionOrCache: boolean,
): void {
  if (isUnboundedHistoryAggregate && !usesProjectionOrCache) {
    throw new Error(
      "Unbounded aggregates on the request path are forbidden; use projections/Redis (ADR-045).",
    );
  }
}

export function assertCompleteSaleSingleTransaction(
  operationsInSameTx: readonly string[],
): void {
  for (const required of READ_VS_WRITE.completeSaleIncludes) {
    if (!operationsInSameTx.includes(required)) {
      throw new Error(
        `CompleteSale must include "${required}" in a single transaction (ADR-045).`,
      );
    }
  }
}

export function assertTimestampQueryUtcStorage(
  storageTimezone: string,
  displayTimezone: string,
): void {
  if (storageTimezone !== IRANIAN_QUERY_CONSIDERATIONS.timestampStorageTimezone) {
    throw new Error(
      `Query/filter timestamps must use UTC storage (ADR-045 Iranian First); got "${storageTimezone}".`,
    );
  }
  if (
    displayTimezone !== IRANIAN_QUERY_CONSIDERATIONS.timestampDisplayTimezone
  ) {
    throw new Error(
      `Display timezone must be Asia/Tehran (ADR-045 Iranian First); got "${displayTimezone}".`,
    );
  }
}

export const QUERY_DESIGN_STANDARDS = {
  strategyDoc: QUERY_STRATEGY_DOC,
  tenantFilter: TENANT_FILTER,
  softDeleteFilter: SOFT_DELETE_FILTER,
  pagination: PAGINATION,
  projections: PROJECTIONS,
  nPlusOne: N_PLUS_ONE,
  repositoryAccess: REPOSITORY_ACCESS,
  crossModuleComposition: CROSS_MODULE_COMPOSITION,
  aggregations: AGGREGATIONS,
  readVsWrite: READ_VS_WRITE,
  iranianConsiderations: IRANIAN_QUERY_CONSIDERATIONS,
  reviewGate: QUERY_REVIEW_GATE,
  requirements: QUERY_DESIGN_REQUIREMENTS,
  alignsWith: {
    tenantColumnSql: TENANT_COLUMN.sql,
    softDeleteColumn: SOFT_DELETE.column.sql,
    indexingQueryDeferral: INDEXING_REQUIREMENTS.queryDesignDeferredAdr,
    storageTimezone: AUDIT_TIMESTAMPS.storageTimezone,
    displayTimezone: AUDIT_TIMESTAMPS.displayTimezone,
    compositionLayer: MODULE_BOUNDARY_RULES.compositionLayer,
    publishedLanguage: MODULE_BOUNDARY_RULES.publishedLanguage,
  },
} as const;
