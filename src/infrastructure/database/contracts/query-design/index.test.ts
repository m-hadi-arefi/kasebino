import { describe, expect, it } from "vitest";

import {
  AUDIT_TIMESTAMPS,
  SOFT_DELETE,
  TENANT_COLUMN,
} from "../modeling/index.js";
import { INDEXING_REQUIREMENTS } from "../indexing/index.js";
import { MODULE_BOUNDARY_RULES } from "../../../../shared/contracts/modular-monolith/index.js";

import {
  AGGREGATIONS,
  CROSS_MODULE_COMPOSITION,
  IRANIAN_QUERY_CONSIDERATIONS,
  N_PLUS_ONE,
  PAGINATION,
  PROJECTIONS,
  QUERY_DESIGN_REQUIREMENTS,
  QUERY_DESIGN_STANDARDS,
  QUERY_REVIEW_GATE,
  QUERY_STRATEGY_DOC,
  READ_VS_WRITE,
  REPOSITORY_ACCESS,
  SOFT_DELETE_FILTER,
  TENANT_FILTER,
  assertApplicationComposition,
  assertCompleteSaleSingleTransaction,
  assertNoNPlusOne,
  assertNoSelectStar,
  assertNoUnboundedAggregateOnRequest,
  assertOltpViaRepository,
  assertPaginationStrategy,
  assertSoftDeleteDefaultExclude,
  assertTenantFilter,
  assertTimestampQueryUtcStorage,
} from "./index.js";

describe("ADR-045 Query Design Standards", () => {
  it("always requires merchant_id tenant filter matching JWT claim", () => {
    expect(TENANT_FILTER.columnSql).toBe("merchant_id");
    expect(TENANT_FILTER.columnSql).toBe(TENANT_COLUMN.sql);
    expect(TENANT_FILTER.requiredOnEveryTenantQuery).toBe(true);
    expect(TENANT_FILTER.mustMatchJwtClaim).toBe(true);
    expect(TENANT_FILTER.forbidClientOnlyMerchantId).toBe(true);
    expect(QUERY_DESIGN_REQUIREMENTS.alwaysFilterMerchantId).toBe(true);
    expect(QUERY_DESIGN_REQUIREMENTS.merchantIdMustMatchJwtClaim).toBe(true);

    expect(() =>
      assertTenantFilter({
        merchantId: "m1",
        jwtMerchantId: "m1",
        isTenantTable: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertTenantFilter({
        merchantId: null,
        jwtMerchantId: "m1",
        isTenantTable: true,
      }),
    ).toThrow(/merchant_id/i);
    expect(() =>
      assertTenantFilter({
        merchantId: "m1",
        jwtMerchantId: "m2",
        isTenantTable: true,
      }),
    ).toThrow(/JWT claim/i);
    expect(() =>
      assertTenantFilter({
        merchantId: "m1",
        jwtMerchantId: null,
        isTenantTable: true,
      }),
    ).toThrow(/JWT/i);
    expect(() =>
      assertTenantFilter({
        merchantId: null,
        jwtMerchantId: null,
        isTenantTable: false,
      }),
    ).not.toThrow();
  });

  it("requires soft-delete exclusion on default reads", () => {
    expect(SOFT_DELETE_FILTER.columnSql).toBe("deleted_at");
    expect(SOFT_DELETE_FILTER.defaultReadsExcludeDeleted).toBe(true);
    expect(SOFT_DELETE_FILTER.predicateWhenApplies).toBe("deleted_at IS NULL");
    expect(SOFT_DELETE_FILTER.defaultReadsExcludeDeleted).toBe(
      SOFT_DELETE.defaultReadsExcludeDeleted,
    );
    expect(QUERY_DESIGN_REQUIREMENTS.softDeleteDefaultExclude).toBe(true);

    expect(() => assertSoftDeleteDefaultExclude(true, true)).not.toThrow();
    expect(() => assertSoftDeleteDefaultExclude(false, false)).not.toThrow();
    expect(() => assertSoftDeleteDefaultExclude(true, false)).toThrow(
      /deleted_at IS NULL/i,
    );
  });

  it("prefers keyset pagination and forbids deep OFFSET", () => {
    expect(PAGINATION.preferredStrategy).toBe("keyset");
    expect(PAGINATION.forbidDeepOffsetOnLargeTables).toBe(true);
    expect(PAGINATION.offsetAllowedFor).toBe("admin_small_pages");
    expect(QUERY_DESIGN_REQUIREMENTS.keysetPaginationPreferred).toBe(true);
    expect(QUERY_DESIGN_REQUIREMENTS.forbidDeepOffset).toBe(true);

    expect(() =>
      assertPaginationStrategy("keyset", {
        largeTable: true,
        adminSmallPage: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertPaginationStrategy("offset", {
        largeTable: false,
        adminSmallPage: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertPaginationStrategy("offset", {
        largeTable: true,
        adminSmallPage: false,
      }),
    ).toThrow(/keyset/i);
    expect(() =>
      assertPaginationStrategy("offset", {
        largeTable: false,
        adminSmallPage: false,
      }),
    ).toThrow(/small admin/i);
  });

  it("forbids SELECT * and requires projections", () => {
    expect(PROJECTIONS.forbidSelectStar).toBe(true);
    expect(PROJECTIONS.selectOnlyNeededColumns).toBe(true);
    expect(PROJECTIONS.listEndpointsMustProject).toBe(true);
    expect(QUERY_DESIGN_REQUIREMENTS.forbidSelectStar).toBe(true);

    expect(() => assertNoSelectStar(false)).not.toThrow();
    expect(() => assertNoSelectStar(true)).toThrow(/SELECT \*/i);
  });

  it("forbids N+1 and requires batch/join/inArray", () => {
    expect(N_PLUS_ONE.forbidden).toBe(true);
    expect(N_PLUS_ONE.requiredPatterns).toContain("inArray");
    expect(QUERY_DESIGN_REQUIREMENTS.avoidNPlusOne).toBe(true);

    expect(() => assertNoNPlusOne(false, true)).not.toThrow();
    expect(() => assertNoNPlusOne(true, true)).toThrow(/N\+1/i);
    expect(() => assertNoNPlusOne(false, false)).toThrow(/batch|join|inArray/i);
  });

  it("requires repositories only for OLTP access", () => {
    expect(REPOSITORY_ACCESS.oltpAccessViaRepositoriesOnly).toBe(true);
    expect(REPOSITORY_ACCESS.domainMayImportDrizzle).toBe(false);
    expect(REPOSITORY_ACCESS.uiMayImportDrizzle).toBe(false);
    expect(REPOSITORY_ACCESS.forbidAdHocSelectInRouteHandlers).toBe(true);
    expect(QUERY_DESIGN_REQUIREMENTS.repositoriesOnlyForOltp).toBe(true);

    expect(() => assertOltpViaRepository("repository")).not.toThrow();
    expect(() => assertOltpViaRepository("domain")).toThrow(/repositories/i);
    expect(() => assertOltpViaRepository("ui")).toThrow(/repositories/i);
    expect(() => assertOltpViaRepository("route_handler")).toThrow(
      /repositories/i,
    );
  });

  it("requires application composition instead of cross-module domain joins", () => {
    expect(CROSS_MODULE_COMPOSITION.forbidDomainCrossModuleJoins).toBe(true);
    expect(CROSS_MODULE_COMPOSITION.composeIn).toEqual([
      MODULE_BOUNDARY_RULES.compositionLayer,
      MODULE_BOUNDARY_RULES.publishedLanguage,
    ]);
    expect(
      QUERY_DESIGN_REQUIREMENTS.applicationCompositionNotCrossModuleJoins,
    ).toBe(true);

    expect(() => assertApplicationComposition("pos", "pos", false)).not.toThrow();
    expect(() =>
      assertApplicationComposition("pos", "inventory", true),
    ).not.toThrow();
    expect(() =>
      assertApplicationComposition("pos", "inventory", false),
    ).toThrow(/cross-module/i);
  });

  it("separates read/write paths and requires CompleteSale single TX", () => {
    expect(READ_VS_WRITE.separateReadAndWritePaths).toBe(true);
    expect(READ_VS_WRITE.completeSaleSingleTransaction).toBe(true);
    expect(READ_VS_WRITE.writeUsesDbTransaction).toBe(true);
    expect(QUERY_DESIGN_REQUIREMENTS.separateReadAndWritePaths).toBe(true);
    expect(QUERY_DESIGN_REQUIREMENTS.completeSaleSingleTransaction).toBe(true);

    expect(() =>
      assertCompleteSaleSingleTransaction([
        "sale",
        "sale_lines",
        "stock",
        "customer_upsert",
        "loyalty",
        "outbox",
      ]),
    ).not.toThrow();
    expect(() =>
      assertCompleteSaleSingleTransaction(["sale", "sale_lines"]),
    ).toThrow(/stock/i);
  });

  it("forbids unbounded aggregates on request and prefers Redis before DB", () => {
    expect(AGGREGATIONS.forbidUnboundedAggregatesOnRequest).toBe(true);
    expect(AGGREGATIONS.preferProjections).toBe(true);
    expect(AGGREGATIONS.preferRedisBeforeDbForHotEntities).toBe(true);
    expect(AGGREGATIONS.dashboardProjectionCacheTtlSeconds).toBe(60);
    expect(QUERY_DESIGN_REQUIREMENTS.forbidUnboundedAggregatesOnRequest).toBe(
      true,
    );
    expect(QUERY_DESIGN_REQUIREMENTS.preferRedisBeforeDbForHotEntities).toBe(
      true,
    );

    expect(() =>
      assertNoUnboundedAggregateOnRequest(true, true),
    ).not.toThrow();
    expect(() =>
      assertNoUnboundedAggregateOnRequest(false, false),
    ).not.toThrow();
    expect(() =>
      assertNoUnboundedAggregateOnRequest(true, false),
    ).toThrow(/projections|Redis/i);
  });

  it("notes UTC storage and Asia/Tehran display (Iranian First); UI N/A", () => {
    expect(IRANIAN_QUERY_CONSIDERATIONS.timestampStorageTimezone).toBe("UTC");
    expect(IRANIAN_QUERY_CONSIDERATIONS.timestampDisplayTimezone).toBe(
      "Asia/Tehran",
    );
    expect(IRANIAN_QUERY_CONSIDERATIONS.displayConvertsToTehranAndJalali).toBe(
      true,
    );
    expect(IRANIAN_QUERY_CONSIDERATIONS.uiRtlNAatSqlLayer).toBe(true);
    expect(IRANIAN_QUERY_CONSIDERATIONS.persianUtf8TextSupported).toBe(true);
    expect(IRANIAN_QUERY_CONSIDERATIONS.barcodeAndFuzzySearchDeferredAdr).toBe(
      "ADR-050",
    );
    expect(QUERY_DESIGN_REQUIREMENTS.utcStorageTehranDisplay).toBe(true);
    expect(AUDIT_TIMESTAMPS.storageTimezone).toBe("UTC");
    expect(AUDIT_TIMESTAMPS.displayTimezone).toBe("Asia/Tehran");

    expect(() =>
      assertTimestampQueryUtcStorage("UTC", "Asia/Tehran"),
    ).not.toThrow();
    expect(() =>
      assertTimestampQueryUtcStorage("Asia/Tehran", "Asia/Tehran"),
    ).toThrow(/UTC/i);
    expect(() => assertTimestampQueryUtcStorage("UTC", "UTC")).toThrow(
      /Asia\/Tehran/i,
    );
  });

  it("keeps this ADR contract-only and aligns with ADR-044 query deferral", () => {
    expect(QUERY_DESIGN_REQUIREMENTS.noConcreteRepositoryImplInThisAdr).toBe(
      true,
    );
    expect(QUERY_DESIGN_REQUIREMENTS.alignsWithIndexingQueryDeferral).toBe(
      true,
    );
    expect(INDEXING_REQUIREMENTS.queryDesignDeferredAdr).toBe("ADR-045");
    expect(QUERY_DESIGN_REQUIREMENTS.migrationStrategyAdr).toBe("ADR-046");
    expect(QUERY_DESIGN_REQUIREMENTS.barcodeSearchDeferredAdr).toBe("ADR-050");
    expect(QUERY_STRATEGY_DOC).toBe("docs/architecture/query-strategy.md");
    expect(QUERY_REVIEW_GATE.explainHotPathsInStaging).toBe(true);
    expect(QUERY_DESIGN_STANDARDS.alignsWith.tenantColumnSql).toBe(
      "merchant_id",
    );
    expect(QUERY_DESIGN_STANDARDS.alignsWith.softDeleteColumn).toBe(
      "deleted_at",
    );
    expect(QUERY_DESIGN_STANDARDS.alignsWith.indexingQueryDeferral).toBe(
      "ADR-045",
    );
    expect(QUERY_DESIGN_STANDARDS.alignsWith.compositionLayer).toBe(
      MODULE_BOUNDARY_RULES.compositionLayer,
    );
    expect(QUERY_DESIGN_STANDARDS.alignsWith.publishedLanguage).toBe(
      MODULE_BOUNDARY_RULES.publishedLanguage,
    );
  });
});
