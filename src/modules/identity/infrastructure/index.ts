export { ConsoleSmsAdapter } from "./sms/console-sms-adapter.js";
export { MockSmsAdapter } from "./sms/mock-sms-adapter.js";
export {
  InMemoryAuthUserRepository,
  InMemoryOtpChallengeRepository,
} from "./persistence/in-memory-repositories.js";
export {
  DrizzleAuthUserRepository,
  DrizzleOtpChallengeRepository,
} from "./persistence/drizzle-repositories.js";
export {
  NEXTAUTH_APP_ROUTER_WIRE_HINT,
  applyMerchantClaimsToSession,
  applyMerchantClaimsToToken,
  createMerchantAuthConfig,
  createMerchantOtpAuthorize,
  type CreateMerchantAuthConfigDeps,
  type MerchantAuthJsConfig,
  type MerchantAuthUser,
  type ResolveMerchantClaims,
} from "./auth/index.js";
