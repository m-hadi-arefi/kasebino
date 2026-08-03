import type { AdminAction } from "./admin-action.js";
import type { AdminUser } from "./admin-user.js";

export type AdminUserRepository = {
  save(user: AdminUser): Promise<void>;
  findById(id: string): Promise<AdminUser | null>;
  findByLogin(login: string): Promise<AdminUser | null>;
  update(user: AdminUser): Promise<void>;
};

export type AdminActionRepository = {
  save(action: AdminAction): Promise<void>;
  findById(id: string): Promise<AdminAction | null>;
  listByMerchant(
    merchantId: string,
    opts?: { limit?: number },
  ): Promise<AdminAction[]>;
  listByAdmin(
    adminUserId: string,
    opts?: { limit?: number },
  ): Promise<AdminAction[]>;
};
