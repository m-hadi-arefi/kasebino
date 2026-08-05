export { ConsoleSmsAdapter } from "./sms/console-sms-adapter.js";
export { MockSmsAdapter } from "./sms/mock-sms-adapter.js";
export {
  InMemoryCustomerIdentityRepository,
  InMemoryCustomerOtpChallengeRepository,
} from "./persistence/in-memory-repositories.js";
export {
  DrizzleCustomerIdentityRepository,
  DrizzleCustomerOtpChallengeRepository,
} from "./persistence/drizzle-repositories.js";
export {
  CUSTOMER_OTP_CREDENTIALS_BRIDGE,
  applyCustomerClaimsToSession,
  applyCustomerClaimsToToken,
  buildCustomerJwtClaims,
  createCustomerAuthConfig,
  createCustomerOtpAuthorize,
  type CreateCustomerAuthConfigDeps,
  type CustomerAuthJsConfig,
  type CustomerAuthUser,
  type CustomerJwtClaims,
  type ResolveCustomerClaims,
} from "./auth/index.js";
