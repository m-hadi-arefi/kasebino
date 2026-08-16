import { type CanonicalRole, type Permission } from "../../../rbac/index.js";

export type StaffStatus = "pending" | "active" | "deactivated";

export interface Role {
  id: string;
  merchantId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface RoleWithPermissions {
  role: Role;
  permissions: Permission[];
}

export interface StaffMembership {
  id: string;
  merchantId: string;
  authUserId: string;
  role: CanonicalRole | string;
  status: StaffStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface StaffRoleAssignment {
  staffMembershipId: string;
  roleId: string;
  createdAt: Date;
}

export interface StaffStoreScope {
  staffMembershipId: string;
  storeId: string;
  createdAt: Date;
}

export interface StaffMemberWithDetails {
  membership: StaffMembership;
  roleIds: string[];
  roles: RoleWithPermissions[];
  effectivePermissions: Permission[];
  storeScopes: StaffStoreScope[];
}

