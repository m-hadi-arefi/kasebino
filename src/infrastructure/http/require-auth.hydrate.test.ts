import { describe, expect, it, vi } from "vitest";

import { hydrateMerchantSessionClaims } from "./require-auth.js";
import type { AuthSessionSnapshot } from "../auth/session-guard.js";
import { ROLE_PERMISSION_MATRIX } from "../security/rbac/index.js";

describe("hydrateMerchantSessionClaims (ADR-156)", () => {
  it("sets merchantId, merchant_owner role, and owner permissions", async () => {
    const session: AuthSessionSnapshot = {
      audience: "merchant",
      merchantId: null,
      roles: [],
      permissions: [],
      user: {
        id: "owner-1",
        audience: "merchant",
        merchantId: null,
        roles: [],
        permissions: [],
      },
    };

    const merchants = {
      findByOwnerUserId: vi.fn().mockResolvedValue({ id: "m-99" }),
    };

    const hydrated = await hydrateMerchantSessionClaims(
      session,
      merchants as never,
    );

    expect(hydrated?.merchantId).toBe("m-99");
    expect(hydrated?.roles).toEqual(["merchant_owner"]);
    expect(hydrated?.permissions).toEqual([
      ...ROLE_PERMISSION_MATRIX.merchant_owner,
    ]);
    expect(hydrated?.user?.merchantId).toBe("m-99");
    expect(hydrated?.user?.roles).toEqual(["merchant_owner"]);
    expect(hydrated?.user?.permissions).toEqual([
      ...ROLE_PERMISSION_MATRIX.merchant_owner,
    ]);
  });

  it("leaves session unchanged when already has merchantId", async () => {
    const session: AuthSessionSnapshot = {
      audience: "merchant",
      merchantId: "m-1",
      roles: ["merchant_owner"],
      user: {
        id: "owner-1",
        merchantId: "m-1",
        roles: ["merchant_owner"],
      },
    };
    const merchants = {
      findByOwnerUserId: vi.fn(),
    };

    const hydrated = await hydrateMerchantSessionClaims(
      session,
      merchants as never,
    );
    expect(hydrated).toBe(session);
    expect(merchants.findByOwnerUserId).not.toHaveBeenCalled();
  });
});
