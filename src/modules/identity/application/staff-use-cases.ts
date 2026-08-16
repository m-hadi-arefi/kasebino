import { randomUUID } from "node:crypto";
import type { CanonicalRole } from "../../../rbac/index.js";
import { normalizeIranianMobile } from "../domain/iranian-phone.js";
import type {
  AuthUserRepository,
  RoleRepository,
  StaffMembershipRepository,
} from "../domain/repositories.js";
import type {
  StaffMembership,
  StaffStoreScope,
} from "../domain/staff.js";
import { createAuthUser } from "../domain/auth-user.js";

export type StaffUseCaseDeps = {
  staffMemberships: StaffMembershipRepository;
  authUsers: AuthUserRepository;
  roles?: RoleRepository;
  now?: () => Date;
  idFactory?: () => string;
};

export type InviteStaffInput = {
  merchantId: string;
  phone: string;
  role?: CanonicalRole | string;
  roleIds?: string[];
  storeIds: string[];
};

export type UpdateStaffInput = {
  merchantId: string;
  staffMembershipId: string;
  role?: CanonicalRole | string;
  roleIds?: string[];
  storeIds: string[];
};

export type DeactivateStaffInput = {
  merchantId: string;
  staffMembershipId: string;
};

export function createStaffUseCases(deps: StaffUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  async function inviteStaff(input: InviteStaffInput): Promise<StaffMembership> {
    const phoneResult = normalizeIranianMobile(input.phone);
    if (!phoneResult.ok) {
      throw new Error("INVALID_PHONE");
    }
    const phone = phoneResult.phone;
    const at = now();

    const resolvedRoleIds = input.roleIds && input.roleIds.length > 0
      ? input.roleIds
      : input.role ? [input.role] : ["store_employee"];
    const primaryRole = (input.role ?? resolvedRoleIds[0] ?? "store_employee") as CanonicalRole;

    let user = await deps.authUsers.findByPhoneE164(phone.e164);
    if (!user) {
      user = createAuthUser({
        id: idFactory(),
        phoneE164: phone.e164,
        phoneNational: phone.national,
        now: at,
      });
      await deps.authUsers.save(user);
    }

    // Check if membership already exists
    const existing = await deps.staffMemberships.findByAuthUserId(user.id);
    const merchantMembership = existing.find(e => e.membership.merchantId === input.merchantId && !e.membership.deletedAt);
    
    if (merchantMembership) {
      throw new Error("STAFF_ALREADY_EXISTS");
    }

    const membership: StaffMembership = {
      id: idFactory(),
      merchantId: input.merchantId,
      authUserId: user.id,
      role: primaryRole,
      status: "pending",
      createdAt: at,
      updatedAt: at,
      deletedAt: null,
    };

    const scopes: StaffStoreScope[] = input.storeIds.map(storeId => ({
      staffMembershipId: membership.id,
      storeId,
      createdAt: at,
    }));

    await deps.staffMemberships.save(membership, scopes, resolvedRoleIds);
    return membership;
  }

  async function listStaff(merchantId: string) {
    return deps.staffMemberships.findByMerchantId(merchantId);
  }

  async function getStaffMember(id: string) {
    return deps.staffMemberships.findById(id);
  }

  async function updateStaff(input: UpdateStaffInput): Promise<void> {
    const at = now();
    const existing = await deps.staffMemberships.findById(input.staffMembershipId);
    
    if (!existing || existing.membership.merchantId !== input.merchantId) {
      throw new Error("STAFF_NOT_FOUND");
    }

    const resolvedRoleIds = input.roleIds && input.roleIds.length > 0
      ? input.roleIds
      : input.role ? [input.role] : existing.roleIds;
    const primaryRole = (input.role ?? resolvedRoleIds[0] ?? existing.membership.role) as CanonicalRole;

    const updatedMembership: StaffMembership = {
      ...existing.membership,
      role: primaryRole,
      updatedAt: at,
    };

    const scopes: StaffStoreScope[] = input.storeIds.map(storeId => ({
      staffMembershipId: updatedMembership.id,
      storeId,
      createdAt: at,
    }));

    await deps.staffMemberships.update(updatedMembership, scopes, resolvedRoleIds);
  }

  async function deactivateStaff(input: DeactivateStaffInput): Promise<void> {
    const at = now();
    const existing = await deps.staffMemberships.findById(input.staffMembershipId);
    
    if (!existing || existing.membership.merchantId !== input.merchantId) {
      throw new Error("STAFF_NOT_FOUND");
    }

    const updatedMembership: StaffMembership = {
      ...existing.membership,
      status: "deactivated",
      updatedAt: at,
    };

    await deps.staffMemberships.update(updatedMembership, existing.storeScopes, existing.roleIds);
  }

  return { inviteStaff, listStaff, getStaffMember, updateStaff, deactivateStaff };
}

export type StaffUseCases = ReturnType<typeof createStaffUseCases>;

