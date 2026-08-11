import type { AuthUser } from "./auth-user.js";
import type { OtpChallenge } from "./otp-challenge.js";
import type { StaffMembership, StaffStoreScope } from "./staff.js";

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
  save(membership: StaffMembership, storeScopes: StaffStoreScope[]): Promise<void>;
  update(membership: StaffMembership, storeScopes: StaffStoreScope[]): Promise<void>;
  findByMerchantId(merchantId: string): Promise<Array<{ membership: StaffMembership; storeScopes: StaffStoreScope[] }>>;
  findById(id: string): Promise<{ membership: StaffMembership; storeScopes: StaffStoreScope[] } | null>;
  findByAuthUserId(authUserId: string): Promise<Array<{ membership: StaffMembership; storeScopes: StaffStoreScope[] }>>;
};
