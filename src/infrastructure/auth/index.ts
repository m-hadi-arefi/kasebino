export {
  createAppAuthConfig,
  type CreateAppAuthConfigDeps,
} from "./create-app-auth-config.js";
export {
  bootstrapCustomerStoreSession,
  type CustomerSessionBootstrapInput,
  type CustomerSessionBootstrapResult,
} from "./customer-session-bootstrap.js";
export {
  createOtpRuntime,
  getOtpRuntime,
  resetOtpRuntimeForTests,
  setOtpRuntimeForTests,
  type CreateOtpRuntimeOptions,
  type OtpRuntime,
} from "./otp-runtime.js";
export {
  createCustomerSmsAdapter,
  createMerchantSmsAdapter,
  isConsoleSmsAdapter,
  isLocalSmsEnvironment,
  assertConsoleSmsAllowed,
  type SmsRuntimeEnv,
} from "./sms-adapter-factory.js";
export {
  ACTIVE_STORE_COOKIE,
  ACTIVE_STORE_COOKIE_OPTIONS,
  activeStoreClearCookieHeader,
  activeStoreSetCookieHeader,
  parseActiveStoreCookie,
} from "./active-store.js";
export {
  customerLoginPath,
  extractStoreSlug,
  isAdminProtectedPath,
  isCustomerDashboardPath,
  isCustomerLoginPath,
  isCustomerSession,
  isMerchantProtectedPath,
  isMerchantSession,
  isPlatformAdminSession,
  merchantIdFromSession,
  merchantLoginPath,
  sessionAudience,
  type AuthSessionSnapshot,
  type SessionAudience,
} from "./session-guard.js";
export {
  AUTH_UX_COPY_FA,
  AUTH_UX_UIUX_GATE,
  assertAuthUxUiuxGate,
} from "./auth-ux.js";
export { AUTH_UX_COPY_FA as AUTH_UX_COPY_FA_CLIENT } from "./auth-ux-copy.js";
export {
  handleCustomerOtpRequest,
  handleMerchantOtpRequest,
} from "./otp-http.js";
