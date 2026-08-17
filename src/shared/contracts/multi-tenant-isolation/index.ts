/**
 * ADR-048 — Multi-Tenant Data Isolation contract.
 *
 * Shared database / shared schema with row-level merchant_id isolation.
 * Store-scoped membership and inventory under merchant (ADR-091).
 * Repositories filter from trusted auth context; cross-tenant access denied.
 * PostgreSQL RLS is optional hardening deferred — not MVP.
 *
 * Normative prose: docs/architecture/05-multi-tenant-strategy.md,
 * docs/architecture/database-architecture.md
 */

import {
  TENANT_ISOLATION_EXPECTATIONS,
  assertMerchantIdIsolation,
} from "../../../infrastructure/database/contracts/postgresql-architecture/index.js";
import {
  TENANT_COLUMN,
  assertMerchantIdOnTenantTable,
} from "../../../infrastructure/database/contracts/modeling/index.js";
import {
  TENANT_FILTER,
  assertTenantFilter,
} from "../../../infrastructure/database/contracts/query-design/index.js";

/** Normative strategy documents. */
export const MULTI_TENANT_STRATEGY_DOC =
  "docs/architecture/05-multi-tenant-strategy.md" as const;
export const DATABASE_ARCHITECTURE_DOC =
  "docs/architecture/database-architecture.md" as const;

/**
 * Shared-DB SaaS isolation model — cost-effective row discriminator.
 * Schema-per-tenant / DB-per-tenant are out of MVP scope.
 */
export const ISOLATION_MODEL = {
  model: TENANT_ISOLATION_EXPECTATIONS.model,
  sharedDatabase: true,
  sharedSchema: true,
  rowLevelDiscriminator: true,
  dbPerTenantForbiddenInMvp: true,
  schemaPerTenantForbiddenInMvp: true,
  strategyDoc: MULTI_TENANT_STRATEGY_DOC,
} as const;

/**
 * Tenant discriminator — mandatory UUID merchant_id on tenant-owned rows.
 * App: merchantId; SQL: merchant_id. Aligns ADR-041 / ADR-043.
 */
export const MERCHANT_TENANT_COLUMN = {
  sql: TENANT_COLUMN.sql,
  app: TENANT_COLUMN.app,
  typeSql: "uuid",
  notNull: true,
  requiredOnTenantTables: true,
  uniquesMustIncludeMerchantId: TENANT_COLUMN.uniquesMustIncludeMerchantId,
  pureJoinTablesMayInheritViaParent: true,
  stillFilterAuthContextOnQueries: true,
} as const;

/**
 * Store scope (ADR-091 / store-first Iranian multi-store).
 * Membership and inventory are store-owned; always still under merchant_id.
 */
export const STORE_SCOPE = {
  columnSql: TENANT_ISOLATION_EXPECTATIONS.storeColumn.sql,
  columnApp: TENANT_ISOLATION_EXPECTATIONS.storeColumn.app,
  typeSql: "uuid",
  notNullWhenStoreOwned: true,
  alwaysUnderMerchantId: true,
  multiStoreEnabledMvp: true,
  policyAdr: "ADR-091",
  storeOwnedEntityExamples: [
    "store_memberships",
    "stock_items",
    "inventory",
    "sales",
    "wallets",
  ] as const,
  requiredStoreScopeFor: ["membership", "inventory"] as const,
  merchantOwnedMayOmitStoreId: [
    "merchants",
    "merchant_settings",
    "products",
  ] as const,
} as const;

/**
 * Auth context rules — repositories filter merchantId from trusted JWT claims,
 * never client-only values without match (deepens ADR-045 TENANT_FILTER).
 */
export const AUTH_CONTEXT_FILTERS = {
  requiredOnEveryTenantQuery: TENANT_FILTER.requiredOnEveryTenantQuery,
  mustMatchJwtClaim: TENANT_FILTER.mustMatchJwtClaim,
  forbidClientOnlyMerchantId: TENANT_FILTER.forbidClientOnlyMerchantId,
  examplePredicate: TENANT_FILTER.examplePredicate,
  source: "trusted_auth_context",
  jwtClaimsExpected: [
    "sub",
    "merchantId",
    "roles",
    "tokenVersion",
  ] as const,
  merchantIdNullableOnlyForPreMerchantOnboarding: true,
} as const;

/**
 * Cross-tenant access is fatal — deny read/update by entity ID alone.
 */
export const CROSS_TENANT_DENY = {
  forbidReadOtherMerchantByIdAlone: true,
  forbidUpdateOtherMerchantByIdAlone: true,
  forbidDeleteOtherMerchantByIdAlone: true,
  storefrontExposesOnlyPublicFieldsForSlugMappedMerchant: true,
  mandatoryIsolationTests: true,
} as const;

/**
 * Platform admin may touch global tables / cross-tenant only when role-gated
 * and the action is audited (AuditPort → `src/infrastructure/security/contracts/audit-logging/` / ADR-058).
 */
export const PLATFORM_ADMIN_EXCEPTION = {
  role: "platform_admin",
  globalTablesRoleGated: true,
  crossTenantRequiresPlatformAdmin: true,
  requiresAuditedAction: true,
  auditImplementationAdr: "ADR-058",
  auditImplementationPackage: "src/infrastructure/security/contracts/audit-logging/",
  forbidUnauditedCrossTenant: true,
} as const;

/** Tenant-scoped unique business keys — deepen ADR-044. */
export const TENANT_SCOPED_UNIQUES = {
  required: true,
  mustIncludeMerchantId: true,
  examples: [
    "UNIQUE (merchant_id, phone) WHERE deleted_at IS NULL",
    "UNIQUE (merchant_id, barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL",
    "UNIQUE (store_id, customer_id) WHERE deleted_at IS NULL",
  ] as const,
} as const;

/**
 * Cache keys and realtime topics must include merchantId.
 * Concrete Redis/EMQX wiring → ADR-051+ / realtime ADRs.
 */
export const TENANT_KEY_PROPAGATION = {
  cacheKeysIncludeMerchantId: true,
  emqxTopicsIncludeMerchantId: true,
  cacheDetailAdr: "ADR-051",
  analyticsMustFilterMerchantId: true,
} as const;

/**
 * PostgreSQL Row-Level Security — optional defense-in-depth later.
 * MVP relies on repository + auth-context filters; do not enable RLS now.
 */
export const ROW_LEVEL_SECURITY = {
  mvpRequired: false,
  optionalFutureHardening: true,
  deferred: true,
  primaryControl: "application_repository_auth_context_filters",
  note: "RLS may be added later as defense-in-depth; not a substitute for assertTenantMatch / repo filters in MVP.",
} as const;

/**
 * Iranian First — store-first Iranian multi-store under merchant tenant.
 */
export const IRANIAN_MULTI_STORE = {
  multiStoreEnabled: true,
  storeFirstMembership: true,
  storeFirstInventory: true,
  modelsIranianMultiBranchMerchants: true,
  persianUtf8TenantRowsSupported: true,
} as const;

export const MULTI_TENANT_REQUIREMENTS = {
  sharedSchemaRowDiscriminator: true,
  merchantIdMandatoryOnTenantRows: true,
  storeScopedMembershipAndInventory: true,
  repoFiltersFromAuthContext: true,
  denyCrossTenantReads: true,
  platformAdminAuditedExceptionOnly: true,
  tenantScopedUniques: true,
  cacheAndTopicsIncludeMerchantId: true,
  analyticsTenantFilters: true,
  rlsOptionalDeferred: true,
  noDomainTablesInThisAdr: true,
  noRlsPoliciesInThisAdr: true,
} as const;

export type TenantAuthContext = {
  merchantId: string | null | undefined;
  roles?: readonly string[];
};

export type TenantMatchInput = {
  /** Row or query filter merchant id */
  rowMerchantId: string | null | undefined;
  /** Trusted auth-context merchant id (JWT claim) */
  authMerchantId: string | null | undefined;
  isPlatformAdmin?: boolean;
  auditedCrossTenantAction?: boolean;
};

/**
 * Primary isolation helper — row/filter merchantId must match auth context.
 * Platform admin may bypass only with an audited cross-tenant action.
 */
export function assertTenantMatch(input: TenantMatchInput): void {
  // Platform admin may bypass merchant match only with an audited cross-tenant action.
  if (
    input.isPlatformAdmin === true &&
    input.auditedCrossTenantAction === true
  ) {
    return;
  }

  if (input.rowMerchantId == null || String(input.rowMerchantId).trim() === "") {
    throw new Error(
      `Tenant row/filter requires "${MERCHANT_TENANT_COLUMN.sql}" (ADR-048).`,
    );
  }
  if (
    input.authMerchantId == null ||
    String(input.authMerchantId).trim() === ""
  ) {
    throw new Error(
      "Tenant access requires auth-context merchantId claim (ADR-048).",
    );
  }
  if (input.rowMerchantId !== input.authMerchantId) {
    throw new Error(
      "Cross-tenant access denied: merchant_id does not match auth context (ADR-048).",
    );
  }
}

export function assertMerchantIdMandatoryOnTenantRow(input: {
  isTenantTable: boolean;
  hasMerchantId: boolean;
  columnSql?: string;
  notNull?: boolean;
}): void {
  if (!input.isTenantTable) {
    return;
  }
  assertMerchantIdOnTenantTable(
    true,
    input.columnSql ?? MERCHANT_TENANT_COLUMN.sql,
  );
  assertMerchantIdIsolation(input.columnSql ?? MERCHANT_TENANT_COLUMN.sql);
  if (!input.hasMerchantId) {
    throw new Error(
      "Tenant tables require non-null merchant_id on every row (ADR-048).",
    );
  }
  if (input.notNull === false) {
    throw new Error("merchant_id must be NOT NULL on tenant tables (ADR-048).");
  }
}

export function assertStoreScopeForEntity(input: {
  entityKind: string;
  hasStoreId: boolean;
  hasMerchantId: boolean;
}): void {
  const requiresStore = (
    STORE_SCOPE.requiredStoreScopeFor as readonly string[]
  ).includes(input.entityKind);
  if (!requiresStore) {
    return;
  }
  if (!input.hasMerchantId) {
    throw new Error(
      `Store-scoped "${input.entityKind}" still requires merchant_id (ADR-048 / ADR-091).`,
    );
  }
  if (!input.hasStoreId) {
    throw new Error(
      `Store-scoped "${input.entityKind}" requires store_id (ADR-048 / ADR-091).`,
    );
  }
}

export function assertDenyCrossTenantRead(input: {
  requestedMerchantId: string;
  authMerchantId: string;
  isPlatformAdmin?: boolean;
  auditedCrossTenantAction?: boolean;
}): void {
  const matchInput: TenantMatchInput = {
    rowMerchantId: input.requestedMerchantId,
    authMerchantId: input.authMerchantId,
  };
  if (input.isPlatformAdmin !== undefined) {
    matchInput.isPlatformAdmin = input.isPlatformAdmin;
  }
  if (input.auditedCrossTenantAction !== undefined) {
    matchInput.auditedCrossTenantAction = input.auditedCrossTenantAction;
  }
  assertTenantMatch(matchInput);
}

export function assertAuthContextTenantFilter(input: {
  merchantId: string | null | undefined;
  jwtMerchantId: string | null | undefined;
  isTenantTable: boolean;
}): void {
  assertTenantFilter({
    merchantId: input.merchantId,
    jwtMerchantId: input.jwtMerchantId,
    isTenantTable: input.isTenantTable,
  });
}

export function assertPlatformAdminCrossTenant(input: {
  role: string;
  audited: boolean;
}): void {
  if (input.role !== PLATFORM_ADMIN_EXCEPTION.role) {
    throw new Error(
      `Cross-tenant access requires role "${PLATFORM_ADMIN_EXCEPTION.role}" (ADR-048).`,
    );
  }
  if (!input.audited) {
    throw new Error(
      "Platform admin cross-tenant actions must be audited (ADR-048).",
    );
  }
}

export function assertRlsDeferred(input: {
  rlsEnabledInMvp: boolean;
  primaryControl?: string;
}): void {
  if (input.rlsEnabledInMvp) {
    throw new Error(
      "PostgreSQL RLS is deferred optional hardening — must not be MVP-required (ADR-048).",
    );
  }
  const control =
    input.primaryControl ?? ROW_LEVEL_SECURITY.primaryControl;
  if (control !== ROW_LEVEL_SECURITY.primaryControl) {
    throw new Error(
      `Primary tenant control must be "${ROW_LEVEL_SECURITY.primaryControl}" (ADR-048).`,
    );
  }
}

export function assertTenantKeyIncludesMerchantId(input: {
  cacheKey?: string;
  topic?: string;
}): void {
  const fragments = [input.cacheKey, input.topic].filter(
    (v): v is string => typeof v === "string",
  );
  for (const fragment of fragments) {
    if (
      !fragment.includes("merchant") &&
      !fragment.includes(MERCHANT_TENANT_COLUMN.sql) &&
      !fragment.includes(MERCHANT_TENANT_COLUMN.app)
    ) {
      throw new Error(
        "Cache keys and EMQX topics must include merchantId (ADR-048).",
      );
    }
  }
}

export const MULTI_TENANT_ISOLATION = {
  isolationModel: ISOLATION_MODEL,
  merchantTenantColumn: MERCHANT_TENANT_COLUMN,
  storeScope: STORE_SCOPE,
  authContextFilters: AUTH_CONTEXT_FILTERS,
  crossTenantDeny: CROSS_TENANT_DENY,
  platformAdminException: PLATFORM_ADMIN_EXCEPTION,
  tenantScopedUniques: TENANT_SCOPED_UNIQUES,
  tenantKeyPropagation: TENANT_KEY_PROPAGATION,
  rowLevelSecurity: ROW_LEVEL_SECURITY,
  iranianMultiStore: IRANIAN_MULTI_STORE,
  requirements: MULTI_TENANT_REQUIREMENTS,
  alignsWith: {
    postgresqlTenantColumn: TENANT_ISOLATION_EXPECTATIONS.tenantColumn.sql,
    modelingTenantColumn: TENANT_COLUMN.sql,
    queryTenantFilterColumn: TENANT_FILTER.columnSql,
    storeColumn: TENANT_ISOLATION_EXPECTATIONS.storeColumn.sql,
    policyAdr: STORE_SCOPE.policyAdr,
    detailAdr: TENANT_ISOLATION_EXPECTATIONS.detailAdr,
  },
} as const;
