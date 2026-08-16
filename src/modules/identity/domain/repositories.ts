import type { Permission } from "../../../rbac/index.js";
import type { AuthUser } from "./auth-user.js";
import type { OtpChallenge } from "./otp-challenge.js";
import type {
  Role,
  RoleWithPermissions,
  StaffMembership,
  StaffStoreScope,
} from "./staff.js";

/** Domain port — Drizzle adapter deferred (ARD-002 persistence). */
export type OtpChallengeRepository = {
  save(challenge: OtpChallenge): Promise<void>;
  /**
   * Latest unconsumed challenge for phone (may be expired — use case maps OTP_EXPIRED).
   */
  findLatestUnconsumedByPhoneE164(
    phoneE164: string,
  ): Promise<OtpChallenge | null>;
  update(challenge: OtpChallenge): Promise<void>;
};

/** Domain port — Drizzle adapter deferred (ARD-002 persistence). */
export type AuthUserRepository = {
  findByPhoneE164(phoneE164: string): Promise<AuthUser | null>;
  save(user: AuthUser): Promise<void>;
};

export type RoleRepository = {
  save(role: Role, permissions: Permission[]): Promise<void>;
  update(role: Role, permissions: Permission[]): Promise<void>;
  delete(roleId: string, merchantId: string): Promise<void>;
  findById(id: string): Promise<RoleWithPermissions | null>;
  findByMerchantId(merchantId: string): Promise<RoleWithPermissions[]>;
  findAllSystemRoles(): Promise<RoleWithPermissions[]>;
  findRolesWithPermissions(roleIds: string[]): Promise<RoleWithPermissions[]>;
};

export type StaffMembershipRepository = {
  save(
    membership: StaffMembership,
    storeScopes: StaffStoreScope[],
    roleIds?: string[],
  ): Promise<void>;
  update(
    membership: StaffMembership,
    storeScopes: StaffStoreScope[],
    roleIds?: string[],
  ): Promise<void>;
  findByMerchantId(
    merchantId: string,
  ): Promise<
    Array<{
      membership: StaffMembership;
      roleIds: string[];
      storeScopes: StaffStoreScope[];
    }>
  >;
  findById(
    id: string,
  ): Promise<{
    membership: StaffMembership;
    roleIds: string[];
    storeScopes: StaffStoreScope[];
  } | null>;
  findByAuthUserId(
    authUserId: string,
  ): Promise<
    Array<{
      membership: StaffMembership;
      roleIds: string[];
      storeScopes: StaffStoreScope[];
    }>
  >;
};

