export type { AuthUser } from "./auth-user.js";
export { createAuthUser } from "./auth-user.js";
export {
  merchantLoggedInEvent,
  merchantLoggedOutEvent,
} from "./events.js";
export {
  assertIranianMobile,
  normalizeIranianMobile,
  type IranianMobile,
  type IranianPhoneNormalizeResult,
} from "./iranian-phone.js";
export {
  consumeOtpChallenge,
  createOtpChallenge,
  hasOtpAttemptsRemaining,
  isOtpChallengeConsumed,
  isOtpChallengeExpired,
  recordOtpAttempt,
  type CreateOtpChallengeInput,
  type OtpChallenge,
} from "./otp-challenge.js";
export type {
  AuthUserRepository,
  OtpChallengeRepository,
  RoleRepository,
  StaffMembershipRepository,
} from "./repositories.js";
export type {
  Role,
  RoleWithPermissions,
  StaffMembership,
  StaffStoreScope,
  StaffRoleAssignment,
  StaffMemberWithDetails,
  StaffStatus,
} from "./staff.js";

