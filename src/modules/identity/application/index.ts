export {
  MERCHANT_AUTH_ERROR_CODES,
  MERCHANT_AUTH_ERROR_MESSAGES_FA,
  MERCHANT_OTP_SMS_TEMPLATE_FA,
  MerchantAuthError,
  isMerchantAuthError,
  type MerchantAuthErrorCode,
} from "./errors.js";
export {
  AuthorizationError,
  authContextFromJwtClaims,
  authorize,
  authorizeFromJwtClaims,
  assertStaffPermissionFromJwt,
  captureAuthzDenyMetricFromError,
  hasPermission,
  isAuthorizationError,
  jwtHasPermission,
  normalizeRoles,
  requirePermission,
  requirePermissionFromJwtClaims,
  type AuthContext,
  type AuthorizeInput,
  type CanonicalRole,
  type IdentityAuthContext,
  type JwtAuthClaimsInput,
  type Permission,
} from "./authorization.js";
export {
  createMerchantOtpUseCases,
  type MerchantOtpUseCaseDeps,
  type MerchantOtpUseCases,
  type RequestMerchantOtpInput,
  type RequestMerchantOtpResult,
  type VerifyMerchantOtpInput,
  type VerifyMerchantOtpResult,
} from "./merchant-otp-use-cases.js";
export {
  createStaffUseCases,
  type StaffUseCaseDeps,
  type StaffUseCases,
  type InviteStaffInput,
  type UpdateStaffInput,
  type DeactivateStaffInput,
} from "./staff-use-cases.js";
export type { SmsMessage, SmsPort } from "./ports/sms-port.js";
