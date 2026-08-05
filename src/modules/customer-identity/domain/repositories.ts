import type { CustomerIdentity } from "./customer-identity.js";
import type { CustomerOtpChallenge } from "./otp-challenge.js";

/** Domain port — Drizzle adapter deferred (ARD-030 persistence). */
export type CustomerOtpChallengeRepository = {
  save(challenge: CustomerOtpChallenge): Promise<void>;
  /**
   * Latest unconsumed challenge for phone (may be expired — use case maps OTP_EXPIRED).
   */
  findLatestUnconsumedByPhoneE164(
    phoneE164: string,
  ): Promise<CustomerOtpChallenge | null>;
  update(challenge: CustomerOtpChallenge): Promise<void>;
};

/** Domain port — Drizzle adapter deferred (ARD-030 persistence). */
export type CustomerIdentityRepository = {
  findById(id: string): Promise<CustomerIdentity | null>;
  findByPhoneE164(phoneE164: string): Promise<CustomerIdentity | null>;
  save(identity: CustomerIdentity): Promise<void>;
};
