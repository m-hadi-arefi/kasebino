import { type CanonicalRole } from "../../../rbac/index.js";

export type StaffStatus = "pending" | "active" | "deactivated";

export interface StaffMembership {
  id: string;
  merchantId: string;
  authUserId: string;
  role: CanonicalRole;
  status: StaffStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface StaffStoreScope {
  staffMembershipId: string;
  storeId: string;
  createdAt: Date;
}
