import { describe, expect, it, vi } from "vitest";

import {
  merchantClaimsNeedRefresh,
  resolveMerchantSessionClaims,
} from "./resolve-merchant-session-claims.js";
import { ROLE_PERMISSION_MATRIX } from "../security/rbac/index.js";

describe("resolveMerchantSessionClaims", () => {
  it("returns empty claims when user has no merchant or staff", async () => {
    const claims = await resolveMerchantSessionClaims("user-1", {
      merchants: {
        findByOwnerUserId: vi.fn().mockResolvedValue(null),
      },
      resolveEffectivePermissions: vi.fn().mockResolvedValue(new Set()),
    });
    expect(claims).toEqual({
      merchantId: null,
      roles: [],
      permissions: [],
      storeIds: [],
    });
  });

  it("resolves merchant_owner when ownership exists", async () => {
    const claims = await resolveMerchantSessionClaims("owner-1", {
      merchants: {
        findByOwnerUserId: vi.fn().mockResolvedValue({ id: "m-1" }),
      },
      resolveEffectivePermissions: vi.fn().mockResolvedValue(new Set()),
    });
    expect(claims.merchantId).toBe("m-1");
    expect(claims.roles).toEqual(["merchant_owner"]);
    expect(claims.permissions).toEqual([
      ...ROLE_PERMISSION_MATRIX.merchant_owner,
    ]);
  });

  it("resolves staff membership roles and permissions", async () => {
    const claims = await resolveMerchantSessionClaims("staff-1", {
      merchants: {
        findByOwnerUserId: vi.fn().mockResolvedValue(null),
      },
      staffMemberships: {
        findByAuthUserId: vi.fn().mockResolvedValue([
          {
            membership: {
              merchantId: "m-2",
              status: "active",
              role: "store_employee",
            },
            roleIds: ["store_employee"],
            storeScopes: [{ storeId: "s-1" }],
          },
        ]),
      },
      resolveEffectivePermissions: vi
        .fn()
        .mockResolvedValue(new Set(["pos.sale", "crm.read"])),
    });
    expect(claims).toEqual({
      merchantId: "m-2",
      roles: ["store_employee"],
      permissions: ["pos.sale", "crm.read"],
      storeIds: ["s-1"],
    });
  });
});

describe("merchantClaimsNeedRefresh", () => {
  it("needs refresh when roles are empty", () => {
    expect(
      merchantClaimsNeedRefresh({ merchantId: null, roles: [] }),
    ).toBe(true);
  });

  it("does not refresh platform_admin with null merchantId", () => {
    expect(
      merchantClaimsNeedRefresh({
        merchantId: null,
        roles: ["platform_admin"],
      }),
    ).toBe(false);
  });

  it("needs refresh when staff-like roles lack merchantId", () => {
    expect(
      merchantClaimsNeedRefresh({
        merchantId: null,
        roles: ["store_employee"],
      }),
    ).toBe(true);
  });

  it("does not refresh complete owner token", () => {
    expect(
      merchantClaimsNeedRefresh({
        merchantId: "m-1",
        roles: ["merchant_owner"],
      }),
    ).toBe(false);
  });
});
