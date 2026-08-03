/**
 * ADR-033 — NextAuth JWT Strategy contract.
 *
 * Stateless JWT sessions via Auth.js (next-auth v5); no server session store.
 * Claims carry tenant + roles for ADR-034 RBAC (`src/rbac`).
 * Cookie security for Iranian mobile HTTPS clients.
 *
 * Normative: docs/tech/nextauth.md, docs/tech/jwt.md,
 * docs/architecture/09-authentication-architecture.md
 */

import { AUTH_SECRET_ENV } from "../env-secrets/index.js";

/** Normative strategy documents. */
export const NEXTAUTH_TECH_DOC = "docs/tech/nextauth.md" as const;
export const JWT_TECH_DOC = "docs/tech/jwt.md" as const;
export const AUTH_ARCHITECTURE_DOC =
  "docs/architecture/09-authentication-architecture.md" as const;

/**
 * Core decision — JWT strategy only; database sessions forbidden (AUTH-05).
 */
export const NEXTAUTH_JWT_DECISION = {
  strategy: "jwt" as const,
  library: "next-auth" as const,
  authJsMajor: 5 as const,
  databaseSessionStore: "forbidden" as const,
  adapterRequired: false,
  rationale: "horizontal_scale_stateless",
  logoutAllMechanism: "tokenVersion_bump",
  adr: "ADR-033",
} as const;

/**
 * Merchant JWT claim keys (architecture §JWT).
 * `merchantId` nullable until merchant link; `roles` authorized via ADR-034.
 */
export const JWT_CLAIM_KEYS = [
  "sub",
  "merchantId",
  "roles",
  "tokenVersion",
] as const;

export type JwtClaimKey = (typeof JWT_CLAIM_KEYS)[number];

/**
 * Wire claim shape embedded in Auth.js JWT / session.
 * `merchantId` null = pre-AUTH-06 onboarding; `roles` empty until membership assigns.
 */
export type MerchantJwtClaims = {
  sub: string;
  merchantId: string | null;
  roles: readonly string[];
  tokenVersion: number;
};

/** Standard JWT registered claims we rely on (iat/exp via Auth.js). */
export const JWT_REGISTERED_CLAIMS = ["iat", "exp"] as const;

/**
 * Short access TTL — Auth.js default 30d is too long for stolen-cookie risk.
 * Logout-all uses tokenVersion bump (Tradeoffs).
 */
export const JWT_SESSION_TTL = {
  /** 8h covers a retail shift without multi-day cookie theft window. */
  maxAgeSeconds: 8 * 60 * 60,
  updateAgeSeconds: 60 * 60,
  shortTtlRequired: true,
  refreshRotationHardening: "future_evolution",
} as const;

/**
 * Secure cookie rules for web session (Iranian mobile / HTTPS).
 * Persian session UX copy lands with login UI ADR.
 */
export const SECURE_COOKIE_RULES = {
  httpOnly: true,
  /** Forced true when NODE_ENV=production (HTTPS). */
  secureInProduction: true,
  sameSite: "lax" as const,
  path: "/",
  /** Prefer Auth.js / secure-prefixed cookie names in production. */
  useSecureCookiePrefixInProduction: true,
} as const;

/** Env binding — signing secret from ADR-068 (never data-plane passwords). */
export const NEXTAUTH_ENV = {
  secretEnv: AUTH_SECRET_ENV,
  trustHost: true,
} as const;

/** Credentials/OTP provider bridge (ADR-031 verify → JWT). */
export const OTP_CREDENTIALS_BRIDGE = {
  providerId: "merchant-otp",
  credentialFields: ["phone", "code"] as const,
  otpVerifySource: "src/modules/identity/application/merchant-otp-use-cases",
  noPasswordCredential: true,
  noEmailProvider: true,
} as const;

/**
 * Iranian First notes — no auth screens this ADR (uiuxpromax N/A).
 */
export const NEXTAUTH_JWT_UX_NOTES = {
  locale: "fa-IR",
  sessionExpiryMessaging: "persian_when_ui_lands",
  loginLayout: "rtl_first_when_ui_lands",
  cookiesSecureForIranianMobileHttps: true,
} as const;

export const NEXTAUTH_JWT_MODULE = {
  contractPath: "src/nextauth-jwt",
  authConfigPath: "src/modules/identity/infrastructure/auth",
  folderConvention: "src/modules/identity/infrastructure/auth",
} as const;

export const NEXTAUTH_JWT = {
  decision: NEXTAUTH_JWT_DECISION,
  claimKeys: JWT_CLAIM_KEYS,
  registeredClaims: JWT_REGISTERED_CLAIMS,
  ttl: JWT_SESSION_TTL,
  cookies: SECURE_COOKIE_RULES,
  env: NEXTAUTH_ENV,
  otpBridge: OTP_CREDENTIALS_BRIDGE,
  uxNotes: NEXTAUTH_JWT_UX_NOTES,
  module: NEXTAUTH_JWT_MODULE,
  docs: {
    nextauth: NEXTAUTH_TECH_DOC,
    jwt: JWT_TECH_DOC,
    architecture: AUTH_ARCHITECTURE_DOC,
  },
} as const;

export function assertJwtSessionStrategy(strategy: string): void {
  if (strategy !== NEXTAUTH_JWT_DECISION.strategy) {
    throw new Error(
      `Session strategy must be "${NEXTAUTH_JWT_DECISION.strategy}" (ADR-033); got "${strategy}".`,
    );
  }
}

export function assertNoDatabaseSessionStore(
  databaseSessionStore: string | boolean,
): void {
  const forbidden =
    databaseSessionStore === true ||
    databaseSessionStore === "database" ||
    databaseSessionStore === "enabled";
  if (forbidden) {
    throw new Error(
      "Database session store is forbidden (ADR-033 / AUTH-05); use JWT strategy.",
    );
  }
  if (
    databaseSessionStore !== NEXTAUTH_JWT_DECISION.databaseSessionStore &&
    databaseSessionStore !== false
  ) {
    throw new Error(
      `databaseSessionStore must be "${NEXTAUTH_JWT_DECISION.databaseSessionStore}" or false (ADR-033).`,
    );
  }
}

export function assertRequiredJwtClaims(
  claims: Partial<MerchantJwtClaims>,
): asserts claims is MerchantJwtClaims {
  for (const key of JWT_CLAIM_KEYS) {
    if (!(key in claims) || claims[key] === undefined) {
      throw new Error(`JWT missing required claim "${key}" (ADR-033).`);
    }
  }
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new Error('JWT claim "sub" must be a non-empty string (ADR-033).');
  }
  if (claims.merchantId !== null && typeof claims.merchantId !== "string") {
    throw new Error(
      'JWT claim "merchantId" must be string or null placeholder (ADR-033).',
    );
  }
  if (!Array.isArray(claims.roles)) {
    throw new Error('JWT claim "roles" must be an array (ADR-033).');
  }
  if (
    typeof claims.tokenVersion !== "number" ||
    !Number.isInteger(claims.tokenVersion) ||
    claims.tokenVersion < 0
  ) {
    throw new Error(
      'JWT claim "tokenVersion" must be a non-negative integer (ADR-033).',
    );
  }
}

export function assertShortSessionTtl(maxAgeSeconds: number): void {
  if (maxAgeSeconds !== JWT_SESSION_TTL.maxAgeSeconds) {
    throw new Error(
      `JWT maxAge must be ${JWT_SESSION_TTL.maxAgeSeconds}s (ADR-033 short TTL); got ${maxAgeSeconds}.`,
    );
  }
  if (maxAgeSeconds > 24 * 60 * 60) {
    throw new Error("JWT maxAge must not exceed 24h (ADR-033 short TTL).");
  }
}

export function assertSecureCookieOptions(options: {
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  path: string;
  nodeEnv: string;
}): void {
  if (!options.httpOnly) {
    throw new Error("Session cookie must be httpOnly (ADR-033).");
  }
  if (options.sameSite !== SECURE_COOKIE_RULES.sameSite) {
    throw new Error(
      `Session cookie sameSite must be "${SECURE_COOKIE_RULES.sameSite}" (ADR-033).`,
    );
  }
  if (options.path !== SECURE_COOKIE_RULES.path) {
    throw new Error(
      `Session cookie path must be "${SECURE_COOKIE_RULES.path}" (ADR-033).`,
    );
  }
  if (options.nodeEnv === "production" && !options.secure) {
    throw new Error(
      "Session cookie must be secure in production / HTTPS (ADR-033).",
    );
  }
}

export function assertAuthSecretEnvKey(envKey: string): void {
  if (envKey !== NEXTAUTH_ENV.secretEnv) {
    throw new Error(
      `Auth.js secret must use env "${NEXTAUTH_ENV.secretEnv}" (ADR-033 / ADR-068); got "${envKey}".`,
    );
  }
}

/**
 * Build merchant JWT claims after OTP verify (ADR-031).
 * `merchantId` / `roles` default to null / [] until merchant link + role assign.
 */
export function buildMerchantJwtClaims(input: {
  authUserId: string;
  tokenVersion: number;
  merchantId?: string | null;
  roles?: readonly string[];
}): MerchantJwtClaims {
  const claims: MerchantJwtClaims = {
    sub: input.authUserId,
    merchantId: input.merchantId ?? null,
    roles: input.roles ?? [],
    tokenVersion: input.tokenVersion,
  };
  assertRequiredJwtClaims(claims);
  return claims;
}

/**
 * Reject JWT when stored tokenVersion was bumped (logout-all / security).
 */
export function isTokenVersionAccepted(
  tokenVersion: number,
  currentTokenVersion: number,
): boolean {
  return tokenVersion === currentTokenVersion;
}

/** Resolve cookie `secure` flag from NODE_ENV. */
export function sessionCookieSecure(nodeEnv: string): boolean {
  return nodeEnv === "production";
}
