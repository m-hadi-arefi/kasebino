/**
 * AdminUser — platform operator identity (ADR-013).
 * Never conflate with merchant staff / customer.
 */

export const ADMIN_USER_STATUSES = ["active", "disabled"] as const;
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];

export type AdminUser = {
  readonly id: string;
  /** Login identifier (email or internal handle). */
  login: string;
  /** Persian-capable display name for ops consoles. */
  displayName: string;
  status: AdminUserStatus;
  /** Always platform_admin in this domain. */
  readonly role: "platform_admin";
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreateAdminUserInput = {
  id: string;
  login: string;
  displayName: string;
  now?: Date;
};

export function createAdminUser(input: CreateAdminUserInput): AdminUser {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    login: input.login.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    status: "active",
    role: "platform_admin",
    createdAt: now,
    updatedAt: now,
  };
}

export function isAdminUserActive(user: AdminUser): boolean {
  return user.status === "active";
}
