import { describe, expect, it } from "vitest";

import {
  AUTHZ_DENY_METRICS,
  AUTHZ_ERROR_MESSAGES_FA,
  CANONICAL_ROLES,
  ROLE_ALIASES,
  ROLE_PERMISSION_MATRIX,
  RBAC,
  RBAC_DECISION,
  STORE_SCOPED_PERMISSIONS,
  authorize,
  assertAuthZEnforcedInApplication,
  assertCanonicalRoles,
  assertDenyCrossTenant,
  assertPersianAuthZMessages,
  assertPlatformAdminRoleMatchesIsolation,
  assertPermission,
  assertRolePermissionMatrix,
  buildAuthzDenyMetricLabels,
  hasCanonicalRole,
  hasPermission,
  isAuthorizationError,
  normalizeRole,
  normalizeRoles,
  permissionsForRoles,
  AuthorizationError,
  type AuthContext,
} from "./index.js";

function staffCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    sub: "user-1",
    merchantId: "m-1",
    roles: ["merchant_owner"],
    storeIds: ["s-1"],
    ...overrides,
  };
}

describe("ADR-034 Authorization RBAC Model", () => {
  it("encodes RBAC at application boundary with least privilege", () => {
    expect(RBAC_DECISION.model).toBe("rbac");
    expect(RBAC_DECISION.enforceAt).toBe("application_service_boundary");
    expect(RBAC_DECISION.leastPrivilege).toBe(true);
    expect(RBAC_DECISION.everyQueryTenantOrStoreScoped).toBe(true);
    expect(RBAC_DECISION.adr).toBe("ADR-034");
    expect(RBAC.decision).toEqual(RBAC_DECISION);
    expect(() => assertAuthZEnforcedInApplication("application")).not.toThrow();
    expect(() =>
      assertAuthZEnforcedInApplication("presentation"),
    ).toThrow(/application/i);
  });

  it("defines canonical roles and Iranian staff aliases", () => {
    expect(CANONICAL_ROLES).toEqual([
      "merchant_owner",
      "store_employee",
      "customer",
      "platform_admin",
    ]);
    expect(normalizeRole("owner")).toBe("merchant_owner");
    expect(normalizeRole("manager")).toBe("store_employee");
    expect(normalizeRole("cashier")).toBe("store_employee");
    expect(normalizeRole("staff")).toBe("store_employee");
    expect(normalizeRoles(["owner", "cashier", "unknown"])).toEqual([
      "merchant_owner",
      "store_employee",
    ]);
    expect(ROLE_ALIASES.owner).toBe("merchant_owner");
    expect(() => assertCanonicalRoles()).not.toThrow();
    expect(() => assertPlatformAdminRoleMatchesIsolation()).not.toThrow();
  });

  it("grants merchant_owner full merchant scope including billing", () => {
    const ctx = staffCtx({ roles: ["owner"] });
    expect(hasCanonicalRole(ctx, "merchant_owner")).toBe(true);
    expect(hasPermission(ctx, "merchant.billing")).toBe(true);
    expect(hasPermission(ctx, "merchant.settings_destructive")).toBe(true);
    expect(hasPermission(ctx, "pos.sale")).toBe(true);
    expect(() =>
      authorize(ctx, {
        permission: "merchant.billing",
        resourceMerchantId: "m-1",
      }),
    ).not.toThrow();
    expect(() => assertRolePermissionMatrix()).not.toThrow();
  });

  it("limits store_employee: POS/CRM/loyalty yes, billing/settings no", () => {
    const ctx = staffCtx({
      roles: ["cashier"],
      storeIds: ["s-1"],
    });
    expect(hasPermission(ctx, "pos.sale")).toBe(true);
    expect(hasPermission(ctx, "crm.write")).toBe(true);
    expect(hasPermission(ctx, "loyalty.write")).toBe(true);
    expect(hasPermission(ctx, "merchant.billing")).toBe(false);
    expect(hasPermission(ctx, "merchant.settings_destructive")).toBe(false);
    expect(ROLE_PERMISSION_MATRIX.store_employee).not.toContain(
      "merchant.billing",
    );
    expect(() =>
      authorize(ctx, {
        permission: "merchant.billing",
        resourceMerchantId: "m-1",
      }),
    ).toThrow(AuthorizationError);
    expect(() =>
      authorize(ctx, {
        permission: "pos.sale",
        resourceMerchantId: "m-1",
        resourceStoreId: "s-1",
      }),
    ).not.toThrow();
  });

  it("keeps customer out of staff permissions", () => {
    const ctx: AuthContext = {
      sub: "user-1",
      merchantId: null,
      roles: ["customer"],
    };
    expect(hasPermission(ctx, "customer.self")).toBe(true);
    expect(hasPermission(ctx, "pos.sale")).toBe(false);
    expect(() =>
      authorize(ctx, { permission: "customer.self" }),
    ).not.toThrow();
    expect(() =>
      authorize(ctx, {
        permission: "pos.sale",
        resourceMerchantId: "m-1",
        resourceStoreId: "s-1",
      }),
    ).toThrow(/کارکنان فروشگاه|اجازه/);
  });

  it("gates platform_admin and aligns with isolation exception role", () => {
    const ctx = staffCtx({
      roles: ["platform_admin"],
      merchantId: null,
    });
    expect(hasPermission(ctx, "admin.platform")).toBe(true);
    expect(() =>
      authorize(ctx, {
        permission: "merchant.read",
        resourceMerchantId: "other-m",
        auditedCrossTenantAction: true,
      }),
    ).not.toThrow();
    expect(() =>
      authorize(ctx, {
        permission: "merchant.read",
        resourceMerchantId: "other-m",
        auditedCrossTenantAction: false,
      }),
    ).toThrow(AuthorizationError);
  });

  it("denies cross-tenant access with Persian message", () => {
    const ctx = staffCtx({ roles: ["merchant_owner"], merchantId: "m-1" });
    expect(() =>
      assertDenyCrossTenant(ctx, "m-OTHER", "merchant.read"),
    ).toThrow(AuthorizationError);

    try {
      authorize(ctx, {
        permission: "merchant.read",
        resourceMerchantId: "m-OTHER",
      });
      expect.unreachable("should deny");
    } catch (error) {
      expect(isAuthorizationError(error)).toBe(true);
      if (isAuthorizationError(error)) {
        expect(error.code).toBe("CROSS_TENANT");
        expect(error.messageFa).toBe(AUTHZ_ERROR_MESSAGES_FA.CROSS_TENANT);
        expect(/[\u0600-\u06FF]/.test(error.messageFa)).toBe(true);
        expect(error.message).toBe(error.messageFa);
      }
    }
  });

  it("denies store_employee outside assigned storeIds", () => {
    const ctx = staffCtx({
      roles: ["manager"],
      storeIds: ["s-1"],
    });
    expect(STORE_SCOPED_PERMISSIONS).toContain("pos.sale");
    expect(() =>
      authorize(ctx, {
        permission: "pos.sale",
        resourceMerchantId: "m-1",
        resourceStoreId: "s-2",
      }),
    ).toThrow(/فروشگاه/);

    expect(() =>
      assertPermission(ctx, "inventory.write", {
        resourceMerchantId: "m-1",
        resourceStoreId: "s-1",
      }),
    ).not.toThrow();

    // Owner is merchant-wide — store list not required.
    const owner = staffCtx({ roles: ["owner"], storeIds: [] });
    expect(() =>
      authorize(owner, {
        permission: "pos.sale",
        resourceMerchantId: "m-1",
        resourceStoreId: "s-99",
      }),
    ).not.toThrow();
  });

  it("exposes Persian deny messages and AuthZ deny metric contract", () => {
    expect(() => assertPersianAuthZMessages()).not.toThrow();
    expect(AUTHZ_DENY_METRICS.metricName).toBe("authz.deny");
    expect(AUTHZ_DENY_METRICS.labels).toEqual(
      expect.arrayContaining(["reason", "permission", "role"]),
    );
    const err = new AuthorizationError("FORBIDDEN", {
      permission: "merchant.billing",
    });
    expect(
      buildAuthzDenyMetricLabels({ error: err, roles: ["cashier"] }),
    ).toEqual({
      reason: "FORBIDDEN",
      permission: "merchant.billing",
      role: "store_employee",
    });
    expect(
      permissionsForRoles(["staff"]).has("pos.sale"),
    ).toBe(true);
    expect(RBAC.docs.security).toContain("06-security");
  });

  it("rejects unauthenticated empty subject", () => {
    expect(() =>
      authorize(
        { sub: "", merchantId: "m-1", roles: ["owner"] },
        { permission: "merchant.read", resourceMerchantId: "m-1" },
      ),
    ).toThrow(/وارد شوید/);
  });
});
