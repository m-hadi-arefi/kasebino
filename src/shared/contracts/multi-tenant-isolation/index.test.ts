import { describe, expect, it } from "vitest";

import {
  TENANT_ISOLATION_EXPECTATIONS,
} from "../../../infrastructure/database/contracts/postgresql-architecture/index.js";
import { TENANT_COLUMN } from "../../../infrastructure/database/contracts/modeling/index.js";
import { TENANT_FILTER } from "../../../infrastructure/database/contracts/query-design/index.js";

import {
  AUTH_CONTEXT_FILTERS,
  CROSS_TENANT_DENY,
  IRANIAN_MULTI_STORE,
  ISOLATION_MODEL,
  MERCHANT_TENANT_COLUMN,
  MULTI_TENANT_ISOLATION,
  MULTI_TENANT_REQUIREMENTS,
  PLATFORM_ADMIN_EXCEPTION,
  ROW_LEVEL_SECURITY,
  STORE_SCOPE,
  TENANT_KEY_PROPAGATION,
  TENANT_SCOPED_UNIQUES,
  assertAuthContextTenantFilter,
  assertDenyCrossTenantRead,
  assertMerchantIdMandatoryOnTenantRow,
  assertPlatformAdminCrossTenant,
  assertRlsDeferred,
  assertStoreScopeForEntity,
  assertTenantKeyIncludesMerchantId,
  assertTenantMatch,
} from "./index.js";

describe("ADR-048 Multi-Tenant Data Isolation", () => {
  it("uses shared database/schema with row-level merchant discriminator", () => {
    expect(ISOLATION_MODEL.sharedDatabase).toBe(true);
    expect(ISOLATION_MODEL.sharedSchema).toBe(true);
    expect(ISOLATION_MODEL.rowLevelDiscriminator).toBe(true);
    expect(ISOLATION_MODEL.dbPerTenantForbiddenInMvp).toBe(true);
    expect(ISOLATION_MODEL.schemaPerTenantForbiddenInMvp).toBe(true);
    expect(ISOLATION_MODEL.model).toBe(
      TENANT_ISOLATION_EXPECTATIONS.model,
    );
    expect(MULTI_TENANT_REQUIREMENTS.sharedSchemaRowDiscriminator).toBe(true);
  });

  it("requires merchant_id UUID NOT NULL on tenant rows", () => {
    expect(MERCHANT_TENANT_COLUMN.sql).toBe("merchant_id");
    expect(MERCHANT_TENANT_COLUMN.app).toBe("merchantId");
    expect(MERCHANT_TENANT_COLUMN.typeSql).toBe("uuid");
    expect(MERCHANT_TENANT_COLUMN.notNull).toBe(true);
    expect(MERCHANT_TENANT_COLUMN.requiredOnTenantTables).toBe(true);
    expect(MERCHANT_TENANT_COLUMN.sql).toBe(TENANT_COLUMN.sql);
    expect(MULTI_TENANT_REQUIREMENTS.merchantIdMandatoryOnTenantRows).toBe(
      true,
    );

    expect(() =>
      assertMerchantIdMandatoryOnTenantRow({
        isTenantTable: true,
        hasMerchantId: true,
        columnSql: "merchant_id",
        notNull: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertMerchantIdMandatoryOnTenantRow({
        isTenantTable: true,
        hasMerchantId: false,
        columnSql: "merchant_id",
      }),
    ).toThrow(/non-null merchant_id/i);
    expect(() =>
      assertMerchantIdMandatoryOnTenantRow({
        isTenantTable: true,
        hasMerchantId: true,
        columnSql: "merchant_id",
        notNull: false,
      }),
    ).toThrow(/NOT NULL/i);
    expect(() =>
      assertMerchantIdMandatoryOnTenantRow({
        isTenantTable: false,
        hasMerchantId: false,
      }),
    ).not.toThrow();
  });

  it("requires store_id for membership and inventory under merchant (ADR-091)", () => {
    expect(STORE_SCOPE.columnSql).toBe("store_id");
    expect(STORE_SCOPE.columnApp).toBe("storeId");
    expect(STORE_SCOPE.alwaysUnderMerchantId).toBe(true);
    expect(STORE_SCOPE.multiStoreEnabledMvp).toBe(true);
    expect(STORE_SCOPE.policyAdr).toBe("ADR-091");
    expect(STORE_SCOPE.requiredStoreScopeFor).toEqual(
      expect.arrayContaining(["membership", "inventory"]),
    );
    expect(
      MULTI_TENANT_REQUIREMENTS.storeScopedMembershipAndInventory,
    ).toBe(true);
    expect(IRANIAN_MULTI_STORE.storeFirstMembership).toBe(true);
    expect(IRANIAN_MULTI_STORE.storeFirstInventory).toBe(true);

    expect(() =>
      assertStoreScopeForEntity({
        entityKind: "membership",
        hasStoreId: true,
        hasMerchantId: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertStoreScopeForEntity({
        entityKind: "inventory",
        hasStoreId: false,
        hasMerchantId: true,
      }),
    ).toThrow(/store_id/i);
    expect(() =>
      assertStoreScopeForEntity({
        entityKind: "membership",
        hasStoreId: true,
        hasMerchantId: false,
      }),
    ).toThrow(/merchant_id/i);
    expect(() =>
      assertStoreScopeForEntity({
        entityKind: "products",
        hasStoreId: false,
        hasMerchantId: true,
      }),
    ).not.toThrow();
  });

  it("filters tenant queries from auth context matching JWT merchantId", () => {
    expect(AUTH_CONTEXT_FILTERS.requiredOnEveryTenantQuery).toBe(true);
    expect(AUTH_CONTEXT_FILTERS.mustMatchJwtClaim).toBe(true);
    expect(AUTH_CONTEXT_FILTERS.forbidClientOnlyMerchantId).toBe(true);
    expect(AUTH_CONTEXT_FILTERS.examplePredicate).toBe(
      TENANT_FILTER.examplePredicate,
    );
    expect(AUTH_CONTEXT_FILTERS.jwtClaimsExpected).toEqual(
      expect.arrayContaining(["sub", "merchantId", "roles", "tokenVersion"]),
    );
    expect(MULTI_TENANT_REQUIREMENTS.repoFiltersFromAuthContext).toBe(true);

    expect(() =>
      assertAuthContextTenantFilter({
        merchantId: "m-1",
        jwtMerchantId: "m-1",
        isTenantTable: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertAuthContextTenantFilter({
        merchantId: "m-1",
        jwtMerchantId: "m-2",
        isTenantTable: true,
      }),
    ).toThrow(/JWT|client-only/i);
  });

  it("denies cross-tenant reads via assertTenantMatch", () => {
    expect(CROSS_TENANT_DENY.forbidReadOtherMerchantByIdAlone).toBe(true);
    expect(CROSS_TENANT_DENY.mandatoryIsolationTests).toBe(true);
    expect(MULTI_TENANT_REQUIREMENTS.denyCrossTenantReads).toBe(true);

    expect(() =>
      assertTenantMatch({
        rowMerchantId: "m-1",
        authMerchantId: "m-1",
      }),
    ).not.toThrow();
    expect(() =>
      assertTenantMatch({
        rowMerchantId: "m-other",
        authMerchantId: "m-1",
      }),
    ).toThrow(/Cross-tenant access denied/i);
    expect(() =>
      assertDenyCrossTenantRead({
        requestedMerchantId: "m-other",
        authMerchantId: "m-1",
      }),
    ).toThrow(/Cross-tenant/i);
    expect(() =>
      assertTenantMatch({
        rowMerchantId: null,
        authMerchantId: "m-1",
      }),
    ).toThrow(/merchant_id/i);
    expect(() =>
      assertTenantMatch({
        rowMerchantId: "m-1",
        authMerchantId: null,
      }),
    ).toThrow(/auth-context merchantId/i);
  });

  it("allows platform_admin cross-tenant only when audited", () => {
    expect(PLATFORM_ADMIN_EXCEPTION.role).toBe("platform_admin");
    expect(PLATFORM_ADMIN_EXCEPTION.requiresAuditedAction).toBe(true);
    expect(
      MULTI_TENANT_REQUIREMENTS.platformAdminAuditedExceptionOnly,
    ).toBe(true);

    expect(() =>
      assertTenantMatch({
        rowMerchantId: "m-other",
        authMerchantId: "m-1",
        isPlatformAdmin: true,
        auditedCrossTenantAction: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertTenantMatch({
        rowMerchantId: "m-other",
        authMerchantId: "m-1",
        isPlatformAdmin: true,
        auditedCrossTenantAction: false,
      }),
    ).toThrow(/Cross-tenant/i);
    expect(() =>
      assertPlatformAdminCrossTenant({
        role: "platform_admin",
        audited: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertPlatformAdminCrossTenant({
        role: "merchant_owner",
        audited: true,
      }),
    ).toThrow(/platform_admin/i);
    expect(() =>
      assertPlatformAdminCrossTenant({
        role: "platform_admin",
        audited: false,
      }),
    ).toThrow(/audited/i);
  });

  it("requires tenant-scoped uniques and merchantId in cache/topic keys", () => {
    expect(TENANT_SCOPED_UNIQUES.required).toBe(true);
    expect(TENANT_SCOPED_UNIQUES.mustIncludeMerchantId).toBe(true);
    expect(TENANT_KEY_PROPAGATION.cacheKeysIncludeMerchantId).toBe(true);
    expect(TENANT_KEY_PROPAGATION.emqxTopicsIncludeMerchantId).toBe(true);
    expect(TENANT_KEY_PROPAGATION.analyticsMustFilterMerchantId).toBe(true);
    expect(MULTI_TENANT_REQUIREMENTS.tenantScopedUniques).toBe(true);
    expect(MULTI_TENANT_REQUIREMENTS.cacheAndTopicsIncludeMerchantId).toBe(
      true,
    );
    expect(MULTI_TENANT_REQUIREMENTS.analyticsTenantFilters).toBe(true);

    expect(() =>
      assertTenantKeyIncludesMerchantId({
        cacheKey: "mos:merchant:m-1:product:p-1",
        topic: "merchant/m-1/orders",
      }),
    ).not.toThrow();
    expect(() =>
      assertTenantKeyIncludesMerchantId({
        cacheKey: "mos:product:p-1",
      }),
    ).toThrow(/merchantId/i);
  });

  it("defers PostgreSQL RLS as optional future hardening", () => {
    expect(ROW_LEVEL_SECURITY.mvpRequired).toBe(false);
    expect(ROW_LEVEL_SECURITY.optionalFutureHardening).toBe(true);
    expect(ROW_LEVEL_SECURITY.deferred).toBe(true);
    expect(ROW_LEVEL_SECURITY.primaryControl).toBe(
      "application_repository_auth_context_filters",
    );
    expect(MULTI_TENANT_REQUIREMENTS.rlsOptionalDeferred).toBe(true);
    expect(MULTI_TENANT_REQUIREMENTS.noRlsPoliciesInThisAdr).toBe(true);

    expect(() =>
      assertRlsDeferred({ rlsEnabledInMvp: false }),
    ).not.toThrow();
    expect(() =>
      assertRlsDeferred({ rlsEnabledInMvp: true }),
    ).toThrow(/RLS/i);
    expect(() =>
      assertRlsDeferred({
        rlsEnabledInMvp: false,
        primaryControl: "postgres_rls_only",
      }),
    ).toThrow(/Primary tenant control/i);
  });

  it("aggregates isolation strategy and Iranian store-first multi-store", () => {
    expect(MULTI_TENANT_REQUIREMENTS.noDomainTablesInThisAdr).toBe(true);
    expect(IRANIAN_MULTI_STORE.modelsIranianMultiBranchMerchants).toBe(true);
    expect(MULTI_TENANT_ISOLATION.isolationModel).toBe(ISOLATION_MODEL);
    expect(MULTI_TENANT_ISOLATION.storeScope).toBe(STORE_SCOPE);
    expect(MULTI_TENANT_ISOLATION.rowLevelSecurity).toBe(ROW_LEVEL_SECURITY);
    expect(MULTI_TENANT_ISOLATION.requirements).toBe(MULTI_TENANT_REQUIREMENTS);
    expect(MULTI_TENANT_ISOLATION.alignsWith.postgresqlTenantColumn).toBe(
      "merchant_id",
    );
    expect(MULTI_TENANT_ISOLATION.alignsWith.storeColumn).toBe("store_id");
    expect(MULTI_TENANT_ISOLATION.alignsWith.policyAdr).toBe("ADR-091");
    expect(MULTI_TENANT_ISOLATION.alignsWith.detailAdr).toBe("ADR-048");
  });
});
