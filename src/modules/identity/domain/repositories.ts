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
