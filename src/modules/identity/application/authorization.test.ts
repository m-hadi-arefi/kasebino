import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  authContextFromJwtClaims,
  assertStaffPermissionFromJwt,
  authorizeFromJwtClaims,
  captureAuthzDenyMetricFromError,
  isAuthorizationError,
  jwtHasPermission,
  requirePermission,
  requirePermissionFromJwtClaims,
} from "./authorization.js";

describe("identity application AuthZ helpers (ADR-034)", () => {
  it("builds AuthContext from JWT claims with canonical roles", () => {
    const ctx = authContextFromJwtClaims({
      sub: "u-1",
      merchantId: "m-1",
      roles: ["owner", "cashier"],
      tokenVersion: 2,
      storeIds: ["s-1"],
    });
    expect(ctx.rolesCanonical).toEqual(["merchant_owner", "store_employee"]);
    expect(ctx.storeIds).toEqual(["s-1"]);
    expect(ctx.tokenVersion).toBe(2);
    expect(jwtHasPermission(
      {
        sub: "u-1",
        merchantId: "m-1",
        roles: ["staff"],
        tokenVersion: 0,
      },
      "pos.sale",
    )).toBe(true);
  });

  it("authorizes staff permission and denies cross-tenant from JWT", () => {
    const claims = {
      sub: "u-1",
      merchantId: "m-1",
      roles: ["manager"] as const,
      tokenVersion: 0,
      storeIds: ["s-1"] as const,
    };

    expect(() =>
      assertStaffPermissionFromJwt(claims, "pos.sale", {
        resourceMerchantId: "m-1",
        resourceStoreId: "s-1",
      }),
    ).not.toThrow();

    expect(() =>
      authorizeFromJwtClaims(claims, {
        permission: "pos.sale",
        resourceMerchantId: "m-OTHER",
        resourceStoreId: "s-1",
      }),
    ).toThrow(AuthorizationError);

    try {
      authorizeFromJwtClaims(claims, {
        permission: "merchant.billing",
        resourceMerchantId: "m-1",
      });
      expect.unreachable("billing forbidden for manager");
    } catch (error) {
      expect(isAuthorizationError(error)).toBe(true);
      const labels = captureAuthzDenyMetricFromError(error, claims.roles);
      expect(labels).toEqual({
        reason: "FORBIDDEN",
        permission: "merchant.billing",
        role: "store_manager",
      });
    }
  });

  it("returns null metric capture for non-AuthZ errors", () => {
    expect(captureAuthzDenyMetricFromError(new Error("x"), ["owner"])).toBe(
      null,
    );
  });

  it("requirePermission / requirePermissionFromJwtClaims gate merchant.write", () => {
    const claims = {
      sub: "u-1",
      merchantId: "m-1",
      roles: ["owner"] as const,
      tokenVersion: 0,
    };
    expect(() =>
      requirePermissionFromJwtClaims(claims, "merchant.write", {
        resourceMerchantId: "m-1",
      }),
    ).not.toThrow();

    const ctx = authContextFromJwtClaims({
      sub: "u-emp",
      merchantId: "m-1",
      roles: ["cashier"],
      tokenVersion: 0,
      storeIds: ["s-1"],
    });
    expect(() =>
      requirePermission(ctx, "merchant.write", {
        resourceMerchantId: "m-1",
      }),
    ).toThrow(AuthorizationError);
  });
});
