export type { CustomerIdentity } from "./customer-identity.js";
export { createCustomerIdentity } from "./customer-identity.js";
export {
  customerLoggedInEvent,
  customerLoggedOutEvent,
} from "./events.js";
export {
  assertIranianMobile,
  normalizeIranianMobile,
  type IranianMobile,
  type IranianPhoneNormalizeResult,
} from "./iranian-phone.js";
export {
  consumeCustomerOtpChallenge,
  createCustomerOtpChallenge,
  hasCustomerOtpAttemptsRemaining,
  isCustomerOtpChallengeConsumed,
  isCustomerOtpChallengeExpired,
  recordCustomerOtpAttempt,
  type CreateCustomerOtpChallengeInput,
  type CustomerOtpChallenge,
} from "./otp-challenge.js";
export type {
  CustomerIdentityRepository,
  CustomerOtpChallengeRepository,
} from "./repositories.js";
