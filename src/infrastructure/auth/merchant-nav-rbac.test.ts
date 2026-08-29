import { describe, expect, it } from "vitest";

import { MERCHANT_NAV } from "../../components/layout/nav-config.js";
import {
  normalizeRoles,
  ROLE_PERMISSION_MATRIX,
  type Permission,
} from "../security/rbac/index.js";

function navVisibleWithClaims(input: {
  roles: string[];
  permissions?: string[];
}): typeof MERCHANT_NAV {
  const normalized = normalizeRoles(input.roles);
  const isOwner =
    normalized.includes("merchant_owner") ||
    input.roles.includes("merchant_owner");
  const permSet = new Set<string>(input.permissions ?? []);
  for (const role of normalized) {
    if (ROLE_PERMISSION_MATRIX[role]) {
      for (const p of ROLE_PERMISSION_MATRIX[role]) {
        permSet.add(p);
      }
    }
  }
  const hasPermission = (permission: Permission | string) => {
    if (isOwner && permission !== "admin.platform" && permission !== "customer.self") {
      return true;
    }
    return permSet.has(permission);
  };
  return MERCHANT_NAV.filter(
    (item) =>
      !item.requiredPermission || hasPermission(item.requiredPermission),
  );
}

describe("MERCHANT_NAV permission filter (ADR-156)", () => {
  it("shows zero items with empty claims", () => {
    expect(navVisibleWithClaims({ roles: [], permissions: [] })).toHaveLength(
      0,
    );
  });

  it("shows seller nav items for merchant_owner", () => {
    const items = navVisibleWithClaims({
      roles: ["merchant_owner"],
      permissions: [...ROLE_PERMISSION_MATRIX.merchant_owner],
    });
    expect(items.length).toBe(MERCHANT_NAV.length);
    expect(items.some((i) => i.href === "/dashboard")).toBe(true);
    expect(items.some((i) => i.href === "/pos")).toBe(true);
    expect(items.some((i) => i.href === "/products")).toBe(true);
  });
});
