import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryRoleRepository } from "../infrastructure/persistence/in-memory-repositories.js";
import { createRoleUseCases } from "./role-use-cases.js";

describe("Role Use Cases", () => {
  let roleRepo: InMemoryRoleRepository;
  let useCases: ReturnType<typeof createRoleUseCases>;

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository();
    useCases = createRoleUseCases({ roles: roleRepo });
  });

  it("lists all roles for a merchant, including system roles and custom tenant roles", async () => {
    const initial = await useCases.listRoles("merch-1");
    // System roles: merchant_owner, store_manager, store_employee, customer, platform_admin
    expect(initial.length).toBeGreaterThanOrEqual(5);
    expect(initial.some((r) => r.role.code === "merchant_owner")).toBe(true);
    expect(initial.some((r) => r.role.code === "store_manager")).toBe(true);
    expect(initial.some((r) => r.role.code === "store_employee")).toBe(true);

    // Create a custom role for merch-1
    await useCases.createCustomRole({
      merchantId: "merch-1",
      name: "اپراتور CRM",
      description: "مدیریت مشتریان و پیگیری‌ها",
      permissions: ["crm.read", "crm.write"],
      actorRoles: ["merchant_owner"],
    });

    const updated = await useCases.listRoles("merch-1");
    expect(updated.some((r) => r.role.name === "اپراتور CRM")).toBe(true);

    // Other merchant should not see merch-1's custom role
    const merch2Roles = await useCases.listRoles("merch-2");
    expect(merch2Roles.some((r) => r.role.name === "اپراتور CRM")).toBe(false);
  });

  it("creates custom role and validates permissions assignability", async () => {
    // Attempting to assign admin.platform by merchant owner throws error
    await expect(
      useCases.createCustomRole({
        merchantId: "merch-1",
        name: "ادمین جعلی",
        permissions: ["admin.platform"],
        actorRoles: ["merchant_owner"],
      }),
    ).rejects.toThrow();

    // Valid role creation
    const created = await useCases.createCustomRole({
      merchantId: "merch-1",
      name: "صندوقدار اختصاصی",
      description: "فقط فروش در صندوق",
      permissions: ["pos.sale", "store.read"],
      actorRoles: ["merchant_owner"],
    });

    expect(created.role.id).toBeDefined();
    expect(created.role.name).toBe("صندوقدار اختصاصی");
    expect(created.role.isSystem).toBe(false);
    expect(created.permissions).toEqual(["pos.sale", "store.read"]);
  });

  it("updates custom role and prevents modifying system roles", async () => {
    const created = await useCases.createCustomRole({
      merchantId: "merch-1",
      name: "حسابدار پاره‌وقت",
      permissions: ["finance.view"],
      actorRoles: ["merchant_owner"],
    });

    const updated = await useCases.updateCustomRole({
      merchantId: "merch-1",
      roleId: created.role.id,
      name: "حسابدار ارشد",
      description: "دسترسی کامل مالی",
      permissions: ["finance.view", "finance.manage"],
      actorRoles: ["merchant_owner"],
    });

    expect(updated.role.name).toBe("حسابدار ارشد");
    expect(updated.permissions).toEqual(["finance.view", "finance.manage"]);

    // Attempt to modify system role throws CANNOT_MODIFY_SYSTEM_ROLE
    const sysRole = (await useCases.listRoles("merch-1")).find((r) => r.role.isSystem);
    expect(sysRole).toBeDefined();
    if (sysRole) {
      await expect(
        useCases.updateCustomRole({
          merchantId: "merch-1",
          roleId: sysRole.role.id,
          name: "ویرایش سیستمی",
          permissions: ["pos.sale"],
          actorRoles: ["merchant_owner"],
        }),
      ).rejects.toThrow("CANNOT_MODIFY_SYSTEM_ROLE");
    }
  });

  it("deletes custom role and prevents deleting system roles", async () => {
    const created = await useCases.createCustomRole({
      merchantId: "merch-1",
      name: "نقش موقت",
      permissions: ["inventory.read"],
      actorRoles: ["merchant_owner"],
    });

    await useCases.deleteCustomRole({
      merchantId: "merch-1",
      roleId: created.role.id,
      actorRoles: ["merchant_owner"],
    });

    const list = await useCases.listRoles("merch-1");
    expect(list.some((r) => r.role.id === created.role.id)).toBe(false);

    // Attempt to delete system role throws CANNOT_DELETE_SYSTEM_ROLE
    const sysRole = list.find((r) => r.role.isSystem);
    expect(sysRole).toBeDefined();
    if (sysRole) {
      await expect(
        useCases.deleteCustomRole({
          merchantId: "merch-1",
          roleId: sysRole.role.id,
          actorRoles: ["merchant_owner"],
        }),
      ).rejects.toThrow("CANNOT_DELETE_SYSTEM_ROLE");
    }
  });

  it("resolveEffectivePermissions unions permissions across multiple roles", async () => {
    const role1 = await useCases.createCustomRole({
      merchantId: "merch-1",
      name: "نقش صندوق",
      permissions: ["pos.sale", "store.read"],
      actorRoles: ["merchant_owner"],
    });

    const role2 = await useCases.createCustomRole({
      merchantId: "merch-1",
      name: "نقش وفاداری",
      permissions: ["loyalty.read", "loyalty.write"],
      actorRoles: ["merchant_owner"],
    });

    const effective = await useCases.resolveEffectivePermissions([
      role1.role.id,
      role2.role.id,
    ]);

    expect(effective.has("pos.sale")).toBe(true);
    expect(effective.has("store.read")).toBe(true);
    expect(effective.has("loyalty.read")).toBe(true);
    expect(effective.has("loyalty.write")).toBe(true);
    expect(effective.has("finance.view")).toBe(false);

    // Also resolves canonical role names
    const canonicalEffective = await useCases.resolveEffectivePermissions([
      "store_employee",
      role2.role.id,
    ]);
    expect(canonicalEffective.has("pos.sale")).toBe(true);
    expect(canonicalEffective.has("inventory.read")).toBe(true);
    expect(canonicalEffective.has("loyalty.write")).toBe(true);
  });
});
