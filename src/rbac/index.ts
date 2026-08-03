/**
 * ADR-034 — Authorization RBAC Model contract.
 *
 * Least-privilege RBAC at the application-service boundary.
 * Every tenant/store mutation or query must pass role + scope checks.
 *
 * Normative: docs/architecture/06-security-architecture.md,
 * docs/architecture/05-multi-tenant-strategy.md
 */

import {
  assertTenantMatch,
  PLATFORM_ADMIN_EXCEPTION,
} from "../multi-tenant-isolation/index.js";

/** Normative strategy documents. */
export const SECURITY_ARCHITECTURE_DOC =
  "docs/architecture/06-security-architecture.md" as const;
export const MULTI_TENANT_STRATEGY_DOC =
  "docs/architecture/05-multi-tenant-strategy.md" as const;

/**
 * Canonical roles (ADR-034 Decision + multi-tenant JWT claims).
 * Staff day-to-day labels normalize via ROLE_ALIASES.
 */
export const CANONICAL_ROLES = [
  "merchant_owner",
  "store_employee",
  "customer",
  "platform_admin",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

/**
 * Iranian retail staff labels that may appear on tokens before persistence
 * normalizes to canonical roles (owner / manager / cashier / staff).
 */
export const ROLE_ALIASES = {
  merchant_owner: "merchant_owner",
  owner: "merchant_owner",
  store_employee: "store_employee",
  employee: "store_employee",
  staff: "store_employee",
  manager: "store_employee",
  cashier: "store_employee",
  customer: "customer",
  platform_admin: "platform_admin",
} as const satisfies Record<string, CanonicalRole>;

export type RoleAlias = keyof typeof ROLE_ALIASES;

/**
 * Resource permissions — coarse MVP matrix (ABAC later).
 * Naming: domain.action
 */
export const PERMISSIONS = [
  "merchant.read",
  "merchant.write",
  "merchant.billing",
  "merchant.settings_destructive",
  "store.read",
  "store.write",
  "pos.sale",
  "crm.read",
  "crm.write",
  "loyalty.read",
  "loyalty.write",
  "inventory.read",
  "inventory.write",
  "pickup.manage",
  "customer.self",
  "admin.platform",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Full merchant-owner set (all merchant + store ops; not platform admin). */
const MERCHANT_OWNER_PERMISSIONS: readonly Permission[] = [
  "merchant.read",
  "merchant.write",
  "merchant.billing",
  "merchant.settings_destructive",
  "store.read",
  "store.write",
  "pos.sale",
  "crm.read",
  "crm.write",
  "loyalty.read",
  "loyalty.write",
  "inventory.read",
  "inventory.write",
  "pickup.manage",
];

/**
 * store_employee: POS/CRM/loyalty/inventory/pickup — no billing or
 * destructive merchant settings unless explicitly granted later.
 */
const STORE_EMPLOYEE_PERMISSIONS: readonly Permission[] = [
  "merchant.read",
  "store.read",
  "pos.sale",
  "crm.read",
  "crm.write",
  "loyalty.read",
  "loyalty.write",
  "inventory.read",
  "inventory.write",
  "pickup.manage",
];

const CUSTOMER_PERMISSIONS: readonly Permission[] = ["customer.self"];

const PLATFORM_ADMIN_PERMISSIONS: readonly Permission[] = [
  "admin.platform",
  "merchant.read",
  "store.read",
];

export const ROLE_PERMISSION_MATRIX: Record<
  CanonicalRole,
  readonly Permission[]
> = {
  merchant_owner: MERCHANT_OWNER_PERMISSIONS,
  store_employee: STORE_EMPLOYEE_PERMISSIONS,
  customer: CUSTOMER_PERMISSIONS,
  platform_admin: PLATFORM_ADMIN_PERMISSIONS,
};

/** Permissions that require store scope for store_employee (not owner). */
export const STORE_SCOPED_PERMISSIONS: readonly Permission[] = [
  "pos.sale",
  "crm.read",
  "crm.write",
  "loyalty.read",
  "loyalty.write",
  "inventory.read",
  "inventory.write",
  "pickup.manage",
  "store.read",
  "store.write",
];

export const RBAC_DECISION = {
  model: "rbac" as const,
  enforceAt: "application_service_boundary" as const,
  leastPrivilege: true,
  everyQueryTenantOrStoreScoped: true,
  abacDeferred: true,
  adr: "ADR-034",
} as const;

/**
 * Trusted auth context for AuthZ checks (from JWT + optional store membership).
 */
export type AuthContext = {
  sub: string;
  merchantId: string | null;
  roles: readonly string[];
  /** Store memberships for store_employee scope; owner may omit (all stores). */
  storeIds?: readonly string[];
  tokenVersion?: number;
};

export const AUTHZ_ERROR_CODES = [
  "FORBIDDEN",
  "CROSS_TENANT",
  "STORE_SCOPE_DENIED",
  "UNAUTHENTICATED",
  "CUSTOMER_STAFF_BOUNDARY",
] as const;

export type AuthZErrorCode = (typeof AUTHZ_ERROR_CODES)[number];

/**
 * Iranian First — Persian human deny messages for AuthZ failures.
 */
export const AUTHZ_ERROR_MESSAGES_FA = {
  FORBIDDEN: "اجازه انجام این عملیات را ندارید.",
  CROSS_TENANT: "دسترسی به اطلاعات فروشگاه دیگر مجاز نیست.",
  STORE_SCOPE_DENIED: "اجازه دسترسی به این فروشگاه را ندارید.",
  UNAUTHENTICATED: "برای ادامه وارد شوید.",
  CUSTOMER_STAFF_BOUNDARY:
    "این بخش مخصوص کارکنان فروشگاه است و با حساب مشتری قابل دسترسی نیست.",
} as const satisfies Record<AuthZErrorCode, string>;

export class AuthorizationError extends Error {
  readonly code: AuthZErrorCode;
  readonly messageFa: string;
  readonly permission?: Permission;
  readonly metricReason: AuthZErrorCode;

  constructor(
    code: AuthZErrorCode,
    options?: { permission?: Permission; cause?: unknown },
  ) {
    const messageFa = AUTHZ_ERROR_MESSAGES_FA[code];
    super(messageFa, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AuthorizationError";
    this.code = code;
    this.messageFa = messageFa;
    this.metricReason = code;
    if (options?.permission !== undefined) {
      this.permission = options.permission;
    }
  }
}

export function isAuthorizationError(
  error: unknown,
): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/**
 * AuthZ deny metrics (ADR-034 Analytics Impact).
 * Warehouse/otel emit deferred — contract only.
 */
export const AUTHZ_DENY_METRICS = {
  metricName: "authz.deny",
  labels: ["reason", "permission", "role"] as const,
  emitVia: "observability_port_deferred" as const,
  auditDeniedAccess: true,
  domainImpact: "denied_access_audit",
} as const;

export function normalizeRole(role: string): CanonicalRole | null {
  const key = role.trim().toLowerCase();
  if (key in ROLE_ALIASES) {
    return ROLE_ALIASES[key as RoleAlias];
  }
  return null;
}

export function normalizeRoles(
  roles: readonly string[],
): readonly CanonicalRole[] {
  const out = new Set<CanonicalRole>();
  for (const role of roles) {
    const canonical = normalizeRole(role);
    if (canonical) {
      out.add(canonical);
    }
  }
  return [...out];
}

export function hasCanonicalRole(
  ctx: AuthContext,
  role: CanonicalRole,
): boolean {
  return normalizeRoles(ctx.roles).includes(role);
}

export function permissionsForRoles(
  roles: readonly string[],
): ReadonlySet<Permission> {
  const set = new Set<Permission>();
  for (const role of normalizeRoles(roles)) {
    for (const permission of ROLE_PERMISSION_MATRIX[role]) {
      set.add(permission);
    }
  }
  return set;
}

export function hasPermission(
  ctx: AuthContext,
  permission: Permission,
): boolean {
  return permissionsForRoles(ctx.roles).has(permission);
}

export type AuthorizeInput = {
  permission: Permission;
  /** Resource merchant — required for tenant-owned ops (not customer.self alone / admin.platform). */
  resourceMerchantId?: string | null;
  /** Resource store — required for store-scoped ops when actor is store_employee. */
  resourceStoreId?: string | null;
  /** When true, platform_admin may cross merchant with audited action (ADR-048). */
  auditedCrossTenantAction?: boolean;
};

function requiresMerchantScope(permission: Permission): boolean {
  return (
    permission !== "customer.self" && permission !== "admin.platform"
  );
}

function requiresStoreScopeForEmployee(permission: Permission): boolean {
  return (STORE_SCOPED_PERMISSIONS as readonly string[]).includes(permission);
}

/**
 * Primary AuthZ gate — role permission + tenant (+ store when needed).
 * Throws AuthorizationError with Persian messageFa on deny.
 */
export function authorize(ctx: AuthContext, input: AuthorizeInput): void {
  if (!ctx.sub || ctx.sub.trim() === "") {
    throw new AuthorizationError("UNAUTHENTICATED");
  }

  const roles = normalizeRoles(ctx.roles);
  const isPlatformAdmin = roles.includes("platform_admin");
  const isCustomer = roles.includes("customer");
  const isStaff =
    roles.includes("merchant_owner") || roles.includes("store_employee");

  if (
    input.permission !== "customer.self" &&
    isCustomer &&
    !isStaff &&
    !isPlatformAdmin
  ) {
    throw new AuthorizationError("CUSTOMER_STAFF_BOUNDARY", {
      permission: input.permission,
    });
  }

  if (!hasPermission(ctx, input.permission)) {
    throw new AuthorizationError("FORBIDDEN", {
      permission: input.permission,
    });
  }

  if (requiresMerchantScope(input.permission)) {
    const resourceMerchantId = input.resourceMerchantId;
    if (resourceMerchantId == null || String(resourceMerchantId).trim() === "") {
      if (!(isPlatformAdmin && input.permission === "admin.platform")) {
        throw new AuthorizationError("CROSS_TENANT", {
          permission: input.permission,
        });
      }
    } else {
      try {
        assertTenantMatch({
          rowMerchantId: resourceMerchantId,
          authMerchantId: ctx.merchantId,
          isPlatformAdmin,
          auditedCrossTenantAction: input.auditedCrossTenantAction === true,
        });
      } catch (cause) {
        throw new AuthorizationError("CROSS_TENANT", {
          permission: input.permission,
          cause,
        });
      }
    }
  }

  if (
    roles.includes("store_employee") &&
    !roles.includes("merchant_owner") &&
    requiresStoreScopeForEmployee(input.permission)
  ) {
    const storeId = input.resourceStoreId;
    if (storeId == null || String(storeId).trim() === "") {
      throw new AuthorizationError("STORE_SCOPE_DENIED", {
        permission: input.permission,
      });
    }
    const allowed = ctx.storeIds ?? [];
    if (!allowed.includes(storeId)) {
      throw new AuthorizationError("STORE_SCOPE_DENIED", {
        permission: input.permission,
      });
    }
  }
}

export function assertPermission(
  ctx: AuthContext,
  permission: Permission,
  scope?: Omit<AuthorizeInput, "permission">,
): void {
  authorize(ctx, { permission, ...scope });
}

export function assertDenyCrossTenant(
  ctx: AuthContext,
  resourceMerchantId: string,
  permission: Permission = "merchant.read",
): void {
  authorize(ctx, { permission, resourceMerchantId });
}

export function buildAuthzDenyMetricLabels(input: {
  error: AuthorizationError;
  roles: readonly string[];
}): Record<(typeof AUTHZ_DENY_METRICS.labels)[number], string> {
  return {
    reason: input.error.metricReason,
    permission: input.error.permission ?? "none",
    role: normalizeRoles(input.roles).join("|") || "none",
  };
}

export function assertCanonicalRoles(
  roles: readonly string[] = CANONICAL_ROLES,
): void {
  for (const expected of CANONICAL_ROLES) {
    if (!roles.includes(expected)) {
      throw new Error(
        `RBAC must include canonical role "${expected}" (ADR-034).`,
      );
    }
  }
}

export function assertRolePermissionMatrix(
  matrix: Record<CanonicalRole, readonly Permission[]> = ROLE_PERMISSION_MATRIX,
): void {
  if (!matrix.merchant_owner.includes("merchant.billing")) {
    throw new Error(
      "merchant_owner must include merchant.billing (ADR-034 / security architecture).",
    );
  }
  if (matrix.store_employee.includes("merchant.billing")) {
    throw new Error(
      "store_employee must not include merchant.billing by default (ADR-034).",
    );
  }
  if (matrix.store_employee.includes("merchant.settings_destructive")) {
    throw new Error(
      "store_employee must not include merchant.settings_destructive by default (ADR-034).",
    );
  }
  if (!matrix.store_employee.includes("pos.sale")) {
    throw new Error("store_employee must include pos.sale (ADR-034).");
  }
  if (matrix.customer.some((p) => p !== "customer.self")) {
    throw new Error(
      "customer must not receive merchant staff permissions (ADR-034).",
    );
  }
  if (!matrix.platform_admin.includes("admin.platform")) {
    throw new Error(
      "platform_admin must include admin.platform (ADR-034).",
    );
  }
}

export function assertPersianAuthZMessages(
  messages: Record<AuthZErrorCode, string> = AUTHZ_ERROR_MESSAGES_FA,
): void {
  for (const code of AUTHZ_ERROR_CODES) {
    if (!containsPersianScript(messages[code])) {
      throw new Error(
        `AUTHZ_ERROR_MESSAGES_FA["${code}"] must contain Persian script (ADR-034 Iranian First).`,
      );
    }
  }
}

export function assertAuthZEnforcedInApplication(layer: string): void {
  if (layer !== RBAC_DECISION.enforceAt && layer !== "application") {
    throw new Error(
      `AuthZ must be enforced at application service boundary (ADR-034); got "${layer}".`,
    );
  }
}

export function assertPlatformAdminRoleMatchesIsolation(): void {
  if (PLATFORM_ADMIN_EXCEPTION.role !== "platform_admin") {
    throw new Error(
      "platform_admin role must align with ADR-048 PLATFORM_ADMIN_EXCEPTION.",
    );
  }
}

function containsPersianScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export const RBAC = {
  decision: RBAC_DECISION,
  roles: CANONICAL_ROLES,
  aliases: ROLE_ALIASES,
  permissions: PERMISSIONS,
  matrix: ROLE_PERMISSION_MATRIX,
  storeScopedPermissions: STORE_SCOPED_PERMISSIONS,
  denyMessagesFa: AUTHZ_ERROR_MESSAGES_FA,
  denyMetrics: AUTHZ_DENY_METRICS,
  docs: {
    security: SECURITY_ARCHITECTURE_DOC,
    multiTenant: MULTI_TENANT_STRATEGY_DOC,
  },
} as const;
