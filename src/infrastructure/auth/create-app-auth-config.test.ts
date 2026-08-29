import { describe, expect, it, vi } from "vitest";

import { createAppAuthConfig } from "./create-app-auth-config.js";
import { ROLE_PERMISSION_MATRIX } from "../security/rbac/index.js";

describe("createAppAuthConfig jwt claim refresh (ADR-156)", () => {
  const baseDeps = {
    merchant: {
      verifyOtp: vi.fn(),
      nodeEnv: "test",
    },
    customer: {
      verifyOtp: vi.fn(),
      nodeEnv: "test",
    },
  };

  it("upgrades empty merchant token to merchant_owner when ownership exists", async () => {
    const refreshClaims = vi.fn().mockResolvedValue({
      merchantId: "m-1",
      roles: ["merchant_owner"],
      permissions: [...ROLE_PERMISSION_MATRIX.merchant_owner],
      storeIds: [],
    });

    const config = createAppAuthConfig({
      ...baseDeps,
      merchant: {
        ...baseDeps.merchant,
        refreshClaims,
      },
    });

    const next = await config.callbacks.jwt({
      token: {
        sub: "owner-1",
        audience: "merchant",
        merchantId: null,
        roles: [],
        permissions: [],
        storeIds: [],
        tokenVersion: 0,
      },
    });

    expect(refreshClaims).toHaveBeenCalledWith("owner-1");
    expect(next.merchantId).toBe("m-1");
    expect(next.roles).toEqual(["merchant_owner"]);
    expect(next.permissions).toEqual([
      ...ROLE_PERMISSION_MATRIX.merchant_owner,
    ]);
  });

  it("keeps empty claims when still pre-merchant", async () => {
    const refreshClaims = vi.fn().mockResolvedValue({
      merchantId: null,
      roles: [],
      permissions: [],
      storeIds: [],
    });

    const config = createAppAuthConfig({
      ...baseDeps,
      merchant: {
        ...baseDeps.merchant,
        refreshClaims,
      },
    });

    const token = {
      sub: "user-1",
      audience: "merchant",
      merchantId: null,
      roles: [],
      permissions: [],
      storeIds: [],
      tokenVersion: 0,
    };

    const next = await config.callbacks.jwt({ token: { ...token } });
    expect(refreshClaims).toHaveBeenCalled();
    expect(next.merchantId).toBeNull();
    expect(next.roles).toEqual([]);
  });

  it("does not call refresh for complete owner token", async () => {
    const refreshClaims = vi.fn();
    const config = createAppAuthConfig({
      ...baseDeps,
      merchant: {
        ...baseDeps.merchant,
        refreshClaims,
      },
    });

    await config.callbacks.jwt({
      token: {
        sub: "owner-1",
        audience: "merchant",
        merchantId: "m-1",
        roles: ["merchant_owner"],
        permissions: [...ROLE_PERMISSION_MATRIX.merchant_owner],
        storeIds: [],
        tokenVersion: 1,
      },
    });

    expect(refreshClaims).not.toHaveBeenCalled();
  });

  it("refreshes on session update trigger even when roles present", async () => {
    const refreshClaims = vi.fn().mockResolvedValue({
      merchantId: "m-2",
      roles: ["store_manager"],
      permissions: [...ROLE_PERMISSION_MATRIX.store_manager],
      storeIds: ["s-1"],
    });

    const config = createAppAuthConfig({
      ...baseDeps,
      merchant: {
        ...baseDeps.merchant,
        refreshClaims,
      },
    });

    const next = await config.callbacks.jwt({
      token: {
        sub: "staff-1",
        audience: "merchant",
        merchantId: "m-1",
        roles: ["store_employee"],
        permissions: [],
        storeIds: [],
        tokenVersion: 0,
      },
      trigger: "update",
    });

    expect(refreshClaims).toHaveBeenCalledWith("staff-1");
    expect(next.roles).toEqual(["store_manager"]);
    expect(next.storeIds).toEqual(["s-1"]);
  });
});
