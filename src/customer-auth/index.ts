/**
 * ADR-032 — Customer SMS OTP Authentication contract.
 *
 * Phone OTP for store customers (storefront / PWA / portal).
 * NEVER shares tokens/audience with merchant staff auth (ADR-031).
 * Explicit digital consent checkbox required (ADR-091).
 * Production SMS provider → ADR-083 (SmsPort). JWT session wire → store PWA / later Auth.js.
 */

import {
  DIGITAL_CONSENT_CHECKBOX_LABEL_FA,
} from "../crm-membership/index.js";
import { PHONE_CONSENT_POLICY } from "../mvp-policies/index.js";

/** CUST-* + AUTH-* patterns applied to customer audience (ARD-030). */
export const CUSTOMER_AUTH_REQUIREMENTS = [
  "CUST-01",
  "AUTH-01",
  "AUTH-02",
  "AUTH-03",
  "AUTH-04",
  "AUTH-05",
] as const;

export type CustomerAuthRequirement =
  (typeof CUSTOMER_AUTH_REQUIREMENTS)[number];

/**
 * Core decision snapshot (ADR-032 Decision + audience isolation).
 */
export const CUSTOMER_AUTH_DECISION = {
  strategy: "phone_otp" as const,
  passwordAuth: "forbidden_mvp" as const,
  session: "jwt_stateless" as const,
  /** Customer JWT claims — role must be customer only (never staff). */
  jwtRole: "customer" as const,
  audience: "customer" as const,
  /** Must never issue merchant staff tokens or share merchant OTP store. */
  separateFromMerchantOtp: true,
  /** Customer tokens must not authorize merchant POS/admin APIs. */
  cannotCallMerchantApis: true,
  merchantAuthModule: "src/modules/identity",
  customerAuthModule: "src/modules/customer-identity",
  consent: {
    pattern: PHONE_CONSENT_POLICY.customerDigital.pattern,
    mandatoryCheckbox: true as const,
    policyAdr: "ADR-091",
    /** Canonical Persian checkbox label (shared with CRM digital join). */
    checkboxLabelFa: DIGITAL_CONSENT_CHECKBOX_LABEL_FA,
  },
} as const;

/**
 * OTP and auth route rate-limit notes (mirror ADR-031; enforce via ADR-055).
 */
export const CUSTOMER_OTP_RATE_LIMIT = {
  otpRequestsPerMinute: 3,
  authRoutesPerMinute: 5,
  redisKeyHint: "mos:{env}:rl:customer-otp:{phone|ip}",
  enforcement: "src/rate-limiting",
  enforcementAdr: "ADR-055",
  failPolicyWhenRedisDown: "fail_closed",
  rationale: "Iranian SMS OTP abuse protection (customer audience)",
} as const;

export const CUSTOMER_OTP_POLICY = {
  ttlSeconds: 300,
  maxAttempts: 5,
  codeLength: 6,
  storeHashedAtRest: true,
  neverStorePlaintext: true,
} as const;

/**
 * Dev vs production OTP disclosure (AUTH-03 / AUTH-04).
 * Never return OTP in production responses.
 */
export const CUSTOMER_OTP_ENV_RULES = {
  development: { returnOtpInApi: true, sendSms: false },
  production: { returnOtpInApi: false, sendSms: true },
  smsPortUntilProviderSelected: "console_or_mock_adapter",
  smsProviderAdr: "ADR-083",
  smsProviderStatus: "proposed",
} as const;

/** Planned Route Handler paths (ARD-030) — distinct from merchant `/api/v1/auth/*`. */
export const CUSTOMER_AUTH_API_PATHS = {
  otpRequest: "/api/v1/customer/auth/otp/request",
  otpVerify: "/api/v1/customer/auth/otp/verify",
  logout: "/api/v1/customer/auth/logout",
} as const;

/**
 * Iranian First — future UI notes (no pages in this ADR; uiuxpromax N/A).
 * Screens land with ADR-023 store customer PWA / ARD-030 remainder.
 */
export const CUSTOMER_AUTH_UX_NOTES = {
  locale: "fa-IR",
  layout: "rtl_first_when_ui_lands",
  otpInput: "numeric_mobile_keyboard_friendly",
  smsTemplateLanguage: "persian",
  consentCheckboxRequired: true,
  phoneFormats: ["09xxxxxxxxx", "+98xxxxxxxxxx"] as const,
} as const;

export const CUSTOMER_AUTH_EVENTS = {
  loggedIn: "CustomerLoggedIn",
  loggedOut: "CustomerLoggedOut",
} as const;

/** Minimal JWT claims contract for customer audience (issuance later). */
export const CUSTOMER_JWT_CLAIMS_CONTRACT = {
  role: "customer" as const,
  requiredKeys: ["sub", "role", "tokenVersion"] as const,
  forbiddenStaffRoles: ["owner", "manager", "cashier", "staff"] as const,
  merchantIdClaim: "forbidden",
  permissionsScope: "customer.self",
} as const;

export const CUSTOMER_AUTH_MODULE = {
  boundedContext: "identity_customer",
  modulePath: "src/modules/customer-identity",
  contractPath: "src/customer-auth",
  layers: ["domain", "application", "infrastructure"] as const,
  smsPort: "application/ports/sms-port",
  smsAdapters: "infrastructure/sms",
} as const;

export const CUSTOMER_AUTH = {
  requirements: CUSTOMER_AUTH_REQUIREMENTS,
  decision: CUSTOMER_AUTH_DECISION,
  otpPolicy: CUSTOMER_OTP_POLICY,
  rateLimit: CUSTOMER_OTP_RATE_LIMIT,
  envRules: CUSTOMER_OTP_ENV_RULES,
  apiPaths: CUSTOMER_AUTH_API_PATHS,
  uxNotes: CUSTOMER_AUTH_UX_NOTES,
  events: CUSTOMER_AUTH_EVENTS,
  jwtClaims: CUSTOMER_JWT_CLAIMS_CONTRACT,
  module: CUSTOMER_AUTH_MODULE,
} as const;

export function assertPasswordlessMvp(passwordAuth: string): void {
  if (passwordAuth !== CUSTOMER_AUTH_DECISION.passwordAuth) {
    throw new Error(
      `Customer auth MVP forbids passwords (ADR-032); expected "${CUSTOMER_AUTH_DECISION.passwordAuth}", got "${passwordAuth}".`,
    );
  }
}

export function assertOtpStrategy(strategy: string): void {
  if (strategy !== CUSTOMER_AUTH_DECISION.strategy) {
    throw new Error(
      `Customer auth strategy must be "${CUSTOMER_AUTH_DECISION.strategy}" (ADR-032); got "${strategy}".`,
    );
  }
}

export function assertCustomerJwtRole(role: string): void {
  if (role !== CUSTOMER_AUTH_DECISION.jwtRole) {
    throw new Error(
      `Customer JWT role must be "${CUSTOMER_AUTH_DECISION.jwtRole}" (ADR-032); got "${role}".`,
    );
  }
}

export function assertSeparateFromMerchantOtp(
  separateFromMerchantOtp: boolean,
): void {
  if (!separateFromMerchantOtp) {
    throw new Error(
      "Customer OTP must remain separate from merchant OTP (ADR-032).",
    );
  }
}

export function assertCannotCallMerchantApis(
  cannotCallMerchantApis: boolean,
): void {
  if (!cannotCallMerchantApis) {
    throw new Error(
      "Customer tokens must not call merchant APIs (ADR-032).",
    );
  }
}

export function assertOtpRateLimitPerMinute(limit: number): void {
  if (limit !== CUSTOMER_OTP_RATE_LIMIT.otpRequestsPerMinute) {
    throw new Error(
      `Customer OTP rate limit must be ${CUSTOMER_OTP_RATE_LIMIT.otpRequestsPerMinute}/min (ADR-032); got ${limit}.`,
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
      "Production/staging customer auth responses must never include OTP (ADR-032 / AUTH-04 / ADR-095).",
    );
  }
}

export function assertExplicitConsentCheckbox(
  checkboxAccepted: boolean,
): void {
  if (!checkboxAccepted) {
    throw new Error(
      "Explicit consent checkbox required before customer OTP (ADR-091 / ADR-032).",
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
