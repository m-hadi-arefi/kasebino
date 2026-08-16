import { beforeEach, describe, expect, it } from "vitest";
import {
  InMemoryAuthUserRepository,
  InMemoryRoleRepository,
  InMemoryStaffMembershipRepository,
} from "../infrastructure/persistence/in-memory-repositories.js";
import { createRoleUseCases } from "./role-use-cases.js";
import { createStaffUseCases } from "./staff-use-cases.js";

describe("Staff Use Cases (Multi-role & Dynamic Permissions)", () => {
  let staffRepo: InMemoryStaffMembershipRepository;
  let authUserRepo: InMemoryAuthUserRepository;
  let roleRepo: InMemoryRoleRepository;
  let staffUseCases: ReturnType<typeof createStaffUseCases>;
  let roleUseCases: ReturnType<typeof createRoleUseCases>;

  beforeEach(() => {
    staffRepo = new InMemoryStaffMembershipRepository();
    authUserRepo = new InMemoryAuthUserRepository();
    roleRepo = new InMemoryRoleRepository();
    roleUseCases = createRoleUseCases({ roles: roleRepo });
    staffUseCases = createStaffUseCases({
      staffMemberships: staffRepo,
      authUsers: authUserRepo,
      roles: roleRepo,
    });
  });

  it("invites staff with multiple custom role IDs and store scopes", async () => {
    const posRole = await roleUseCases.createCustomRole({
      merchantId: "merch-1",
      name: "اپراتور صندوق",
      permissions: ["pos.sale", "store.read"],
      actorRoles: ["merchant_owner"],
    });

    const crmRole = await roleUseCases.createCustomRole({
      merchantId: "merch-1",
      name: "مدیر CRM",
      permissions: ["crm.read", "crm.write"],
      actorRoles: ["merchant_owner"],
    });

    const invited = await staffUseCases.inviteStaff({
      merchantId: "merch-1",
      phone: "09121112233",
      roleIds: [posRole.role.id, crmRole.role.id],
      storeIds: ["store-1", "store-2"],
    });

    expect(invited.id).toBeDefined();
    expect(invited.merchantId).toBe("merch-1");
    expect(invited.status).toBe("pending");

    const staffList = await staffUseCases.listStaff("merch-1");
    expect(staffList).toHaveLength(1);
    expect(staffList[0]?.roleIds).toEqual([posRole.role.id, crmRole.role.id]);
    expect(staffList[0]?.storeScopes.map((s) => s.storeId)).toEqual(["store-1", "store-2"]);

    // Calculate effective permissions for this user
    const effective = await roleUseCases.resolveEffectivePermissions(staffList[0]!.roleIds);
    expect(effective.has("pos.sale")).toBe(true);
    expect(effective.has("crm.write")).toBe(true);
    expect(effective.has("finance.view")).toBe(false);
  });

  it("updates staff roles and store scopes", async () => {
    const invited = await staffUseCases.inviteStaff({
      merchantId: "merch-1",
      phone: "09129998877",
      role: "store_employee",
      storeIds: ["store-1"],
    });

    const financeRole = await roleUseCases.createCustomRole({
      merchantId: "merch-1",
      name: "حسابدار",
      permissions: ["finance.view", "finance.manage"],
      actorRoles: ["merchant_owner"],
    });

    await staffUseCases.updateStaff({
      merchantId: "merch-1",
      staffMembershipId: invited.id,
      roleIds: [financeRole.role.id],
      storeIds: [], // All stores
    });

    const updated = await staffUseCases.getStaffMember(invited.id);
    expect(updated).not.toBeNull();
    expect(updated?.roleIds).toEqual([financeRole.role.id]);
    expect(updated?.storeScopes).toEqual([]);
  });

  it("deactivates staff member properly", async () => {
    const invited = await staffUseCases.inviteStaff({
      merchantId: "merch-1",
      phone: "09125554433",
      role: "store_employee",
      storeIds: [],
    });

    await staffUseCases.deactivateStaff({
      merchantId: "merch-1",
      staffMembershipId: invited.id,
    });

    const member = await staffUseCases.getStaffMember(invited.id);
    expect(member?.membership.status).toBe("deactivated");
  });
});
