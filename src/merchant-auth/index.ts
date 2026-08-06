/**
 * ADR-031 — Merchant Authentication Architecture contract.
 *
 * Phone OTP-first, passwordless MVP for merchant staff/owners.
 * JWT session issuance → ADR-033; production SMS provider → ADR-083 (SmsPort).
 */

/** AUTH-* product requirements binding (PRD / ARD-002). */
export const MERCHANT_AUTH_REQUIREMENTS = [
  "AUTH-01",
  "AUTH-02",
  "AUTH-03",
  "AUTH-04",
  "AUTH-05",
  "AUTH-06",
] as const;

export type MerchantAuthRequirement =
  (typeof MERCHANT_AUTH_REQUIREMENTS)[number];

/**
 * Core decision snapshot (ADR-031 Decision + AUTH architecture).
 */
export const MERCHANT_AUTH_DECISION = {
  strategy: "phone_otp" as const,
  /** No email/password in MVP — Iranian SMS OTP norms. */
  passwordAuth: "forbidden_mvp" as const,
  magicLinkEmail: "rejected_alternative" as const,
  session: "jwt_stateless" as const,
  /** Realized by ADR-033 — `src/nextauth-jwt` + identity Auth.js stub. */
  sessionImplementation: "adr_033_nextauth_jwt" as const,
  audience: "merchant_staff" as const,
  /** Must never issue customer-role tokens (ARD-030 / ADR-032). */
  separateFromCustomerOtp: true,
  firstRegisterMayCreateMerchant: true,
  auth06Hook: "AUTH-06",
} as const;

/**
 * OTP and auth route rate-limit notes (ADR-031 Security Impact / NFR-04).
 * Enforcement: `src/rate-limiting` (ADR-055); fail-closed when Redis down (ADR-051).
 */
export const MERCHANT_OTP_RATE_LIMIT = {
  otpRequestsPerMinute: 3,
  authRoutesPerMinute: 5,
  redisKeyHint: "mos:{env}:rl:otp:{phone|ip}",
  enforcement: "src/rate-limiting",
  enforcementAdr: "ADR-055",
  failPolicyWhenRedisDown: "fail_closed",
  rationale: "Iranian SMS OTP abuse protection",
} as const;

export const MERCHANT_OTP_POLICY = {
  ttlSeconds: 300,
  maxAttempts: 5,
  codeLength: 6,
  storeHashedAtRest: true,
  neverStorePlaintext: true,
} as const;

/**
 * Dev vs production OTP disclosure (AUTH-03 / AUTH-04).
 * Never return OTP in production responses (ADR-030 SECURITY_API_RULES).
 */
export const MERCHANT_OTP_ENV_RULES = {
  development: { returnOtpInApi: true, sendSms: false },
  production: { returnOtpInApi: false, sendSms: true },
  smsPortUntilProviderSelected: "console_or_mock_adapter",
  smsProviderAdr: "ADR-083",
  smsProviderStatus: "proposed",
} as const;

/** Planned Route Handler paths (wired when presentation + ADR-033 land). */
export const MERCHANT_AUTH_API_PATHS = {
  otpRequest: "/api/v1/auth/otp/request",
  otpVerify: "/api/v1/auth/otp/verify",
  logout: "/api/v1/auth/logout",
} as const;

/**
 * Iranian First — future UI notes (no pages in this ADR; uiuxpromax N/A).
 */
export const MERCHANT_AUTH_UX_NOTES = {
  locale: "fa-IR",
  layout: "rtl_first_when_ui_lands",
  otpInput: "numeric_mobile_keyboard_friendly",
  smsTemplateLanguage: "persian",
  phoneFormats: ["09xxxxxxxxx", "+98xxxxxxxxxx"] as const,
} as const;

export const MERCHANT_AUTH_EVENTS = {
  loggedIn: "MerchantLoggedIn",
  loggedOut: "MerchantLoggedOut",
} as const;

export const MERCHANT_AUTH_MODULE = {
  boundedContext: "identity",
  modulePath: "src/modules/identity",
  layers: ["domain", "application", "infrastructure"] as const,
  smsPort: "application/ports/sms-port",
  smsAdapters: "infrastructure/sms",
} as const;

export const MERCHANT_AUTH = {
  requirements: MERCHANT_AUTH_REQUIREMENTS,
  decision: MERCHANT_AUTH_DECISION,
  otpPolicy: MERCHANT_OTP_POLICY,
  rateLimit: MERCHANT_OTP_RATE_LIMIT,
  envRules: MERCHANT_OTP_ENV_RULES,
  apiPaths: MERCHANT_AUTH_API_PATHS,
  uxNotes: MERCHANT_AUTH_UX_NOTES,
  events: MERCHANT_AUTH_EVENTS,
  module: MERCHANT_AUTH_MODULE,
} as const;

export function assertPasswordlessMvp(passwordAuth: string): void {
  if (passwordAuth !== MERCHANT_AUTH_DECISION.passwordAuth) {
    throw new Error(
      `Merchant auth MVP forbids passwords (ADR-031); expected "${MERCHANT_AUTH_DECISION.passwordAuth}", got "${passwordAuth}".`,
    );
  }
}

export function assertOtpStrategy(strategy: string): void {
  if (strategy !== MERCHANT_AUTH_DECISION.strategy) {
    throw new Error(
      `Merchant auth strategy must be "${MERCHANT_AUTH_DECISION.strategy}" (ADR-031); got "${strategy}".`,
    );
  }
}

export function assertOtpRateLimitPerMinute(limit: number): void {
  if (limit !== MERCHANT_OTP_RATE_LIMIT.otpRequestsPerMinute) {
    throw new Error(
      `OTP rate limit must be ${MERCHANT_OTP_RATE_LIMIT.otpRequestsPerMinute}/min (ADR-031); got ${limit}.`,
    );
  }
}

export function assertNeverReturnOtpInProduction(
  nodeEnv: string,
  responseIncludesOtp: boolean,
): void {
  if (
    (nodeEnv === "production" || nodeEnv === "staging") &&
    responseIncludesOtp
  ) {
    throw new Error(
      "Production/staging auth responses must never include OTP (ADR-031 / AUTH-04 / ADR-095).",
    );
  }
}

/**
 * Dev OTP in API JSON — only local development or explicit opt-in.
 * Staging/test/production must never leak OTP unless `MOS_RETURN_DEV_OTP=1`
 * or local Docker parity (`MOS_ENV=local` with a production NODE_ENV image).
 */
export function shouldReturnDevOtp(
  nodeEnv: string,
  mosReturnDevOtp:
    | string
    | undefined = typeof process !== "undefined"
    ? process.env.MOS_RETURN_DEV_OTP
    : undefined,
  mosEnv:
    | string
    | undefined = typeof process !== "undefined"
    ? process.env.MOS_ENV
    : undefined,
): boolean {
  if (mosReturnDevOtp === "1") {
    return true;
  }
  if (nodeEnv === "development") {
    return true;
  }
  // Docker compose app profile runs NODE_ENV=production with MOS_ENV=local.
  return (mosEnv ?? "").trim().toLowerCase() === "local";
}

export function shouldSendSms(nodeEnv: string): boolean {
  return nodeEnv === "production";
}
