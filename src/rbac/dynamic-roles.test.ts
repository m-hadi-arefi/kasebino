import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  PERMISSION_CATALOG,
  PERMISSION_DOMAINS,
  ROLE_PERMISSION_MATRIX,
  assertAssignablePermissions,
  authorize,
  hasPermission,
  type AuthContext,
} from "./index.js";

describe("Dynamic Roles & Permissions (ADR-034 extension)", () => {
  it("exports domain metadata and permission catalog with Persian descriptions", () => {
    expect(PERMISSION_DOMAINS.pos.labelFa).toContain("صندوق");
    expect(PERMISSION_DOMAINS.crm.labelFa).toContain("مشتریان");
    expect(PERMISSION_DOMAINS.finance.labelFa).toContain("مالی");
    expect(PERMISSION_DOMAINS.inventory.labelFa).toContain("انبارداری");

    expect(PERMISSION_CATALOG["pos.sale"].domain).toBe("pos");
    expect(PERMISSION_CATALOG["pos.sale"].labelFa).toContain("فروش");
    expect(PERMISSION_CATALOG["crm.read"].domain).toBe("crm");
    expect(PERMISSION_CATALOG["finance.view"].domain).toBe("finance");
  });

  it("assertAssignablePermissions enforces assignability rules", () => {
    // Normal merchant cannot assign admin.platform or customer.self
    expect(() =>
      assertAssignablePermissions(["merchant_owner"], ["pos.sale", "admin.platform"]),
    ).toThrow(AuthorizationError);

    expect(() =>
      assertAssignablePermissions(["merchant_owner"], ["crm.read", "customer.self"]),
    ).toThrow(AuthorizationError);

    // Normal merchant can assign business ops permissions
    expect(() =>
      assertAssignablePermissions(["merchant_owner"], [
        "pos.sale",
        "store.read",
        "crm.read",
        "crm.write",
        "inventory.read",
        "finance.view",
      ]),
    ).not.toThrow();

    // Platform admin can assign any permission
    expect(() =>
      assertAssignablePermissions(["platform_admin"], ["admin.platform", "pos.sale"]),
    ).not.toThrow();
  });

  it("hasPermission checks pre-resolved permissions on AuthContext when provided", () => {
    const customStaffCtx: AuthContext = {
      sub: "user-123",
      merchantId: "merch-1",
      roles: ["custom_role_pos_only"],
      permissions: ["pos.sale", "store.read"],
      storeIds: ["store-1"],
    };

    expect(hasPermission(customStaffCtx, "pos.sale")).toBe(true);
    expect(hasPermission(customStaffCtx, "store.read")).toBe(true);
    expect(hasPermission(customStaffCtx, "finance.view")).toBe(false);
    expect(hasPermission(customStaffCtx, "inventory.read")).toBe(false);
  });

  it("authorize enforces store scope for store-scoped permissions when actor is not merchant_owner", () => {
    const aliCtx: AuthContext = {
      sub: "ali-user",
      merchantId: "merch-1",
      roles: ["pos_operator"],
      permissions: ["pos.sale", "store.read"],
      storeIds: ["store-a"],
    };

    // Store A access allowed
    expect(() =>
      authorize(aliCtx, {
        permission: "pos.sale",
        resourceMerchantId: "merch-1",
        resourceStoreId: "store-a",
      }),
    ).not.toThrow();

    // Store B access denied with STORE_SCOPE_DENIED
    expect(() =>
      authorize(aliCtx, {
        permission: "pos.sale",
        resourceMerchantId: "merch-1",
        resourceStoreId: "store-b",
      }),
    ).toThrowError("اجازه دسترسی به این فروشگاه را ندارید.");
  });

  it("merchant owner bypasses store scopes across all tenant stores", () => {
    const ownerCtx: AuthContext = {
      sub: "owner-user",
      merchantId: "merch-1",
      roles: ["merchant_owner"],
      permissions: [...ROLE_PERMISSION_MATRIX.merchant_owner],
      storeIds: [],
    };

    expect(() =>
      authorize(ownerCtx, {
        permission: "pos.sale",
        resourceMerchantId: "merch-1",
        resourceStoreId: "any-store-id",
      }),
    ).not.toThrow();

    expect(() =>
      authorize(ownerCtx, {
        permission: "finance.view",
        resourceMerchantId: "merch-1",
      }),
    ).not.toThrow();
  });

  it("denies access when merchant tenant mismatches", () => {
    const staffCtx: AuthContext = {
      sub: "user-1",
      merchantId: "merch-1",
      roles: ["crm_specialist"],
      permissions: ["crm.read", "crm.write"],
      storeIds: [],
    };

    expect(() =>
      authorize(staffCtx, {
        permission: "crm.read",
        resourceMerchantId: "merch-2",
      }),
    ).toThrowError("دسترسی به اطلاعات فروشگاه دیگر مجاز نیست.");
  });
});
