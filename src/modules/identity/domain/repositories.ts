import type { AuthUser } from "./auth-user.js";
import type { OtpChallenge } from "./otp-challenge.js";

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

export type StaffMembershipRepository = {
  save(membership: import("./staff.js").StaffMembership, storeScopes: import("./staff.js").StaffStoreScope[]): Promise<void>;
  update(membership: import("./staff.js").StaffMembership, storeScopes: import("./staff.js").StaffStoreScope[]): Promise<void>;
  findByMerchantId(merchantId: string): Promise<Array<{ membership: import("./staff.js").StaffMembership, storeScopes: import("./staff.js").StaffStoreScope[] }>>;
  findById(id: string): Promise<{ membership: import("./staff.js").StaffMembership, storeScopes: import("./staff.js").StaffStoreScope[] } | null>;
  findByAuthUserId(authUserId: string): Promise<Array<{ membership: import("./staff.js").StaffMembership, storeScopes: import("./staff.js").StaffStoreScope[] }>>;
};
