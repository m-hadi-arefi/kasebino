/**
 * ADR-095 / ADR-032 — Auth.js (next-auth v5) JWT config for customer OTP.
 */

import Credentials from "next-auth/providers/credentials";

import {
  JWT_SESSION_TTL,
  NEXTAUTH_ENV,
  NEXTAUTH_JWT_DECISION,
  SECURE_COOKIE_RULES,
  assertJwtSessionStrategy,
  assertNoDatabaseSessionStore,
  assertSecureCookieOptions,
  assertShortSessionTtl,
  sessionCookieSecure,
} from "../../../../nextauth-jwt/index.js";
import type { VerifyCustomerOtpResult } from "../../application/customer-otp-use-cases.js";
import {
  applyCustomerClaimsToSession,
  applyCustomerClaimsToToken,
  buildCustomerJwtClaims,
  type CustomerAuthUser,
} from "./claims.js";

export type {
  CustomerAuthUser,
  CustomerJwtClaims,
} from "./claims.js";
export {
  applyCustomerClaimsToSession,
  applyCustomerClaimsToToken,
  buildCustomerJwtClaims,
} from "./claims.js";

export const CUSTOMER_OTP_CREDENTIALS_BRIDGE = {
  providerId: "customer-otp",
  credentialFields: [
    "phone",
    "code",
    "consentCheckboxAccepted",
    "storeId",
  ] as const,
  noPasswordCredential: true,
} as const;

export type ResolveCustomerClaims = (
  verified: VerifyCustomerOtpResult,
) =>
  | { storeId?: string | null }
  | Promise<{ storeId?: string | null }>;

export type CreateCustomerAuthConfigDeps = {
  verifyOtp: (input: {
    phone: string;
    code: string;
    consentCheckboxAccepted: boolean;
    storeId?: string | null;
  }) => Promise<VerifyCustomerOtpResult>;
  resolveClaims?: ResolveCustomerClaims;
  secret?: string;
  nodeEnv?: string;
};

export type CustomerAuthJsConfig = {
  providers: ReturnType<typeof Credentials>[];
  session: {
    strategy: typeof NEXTAUTH_JWT_DECISION.strategy;
    maxAge: number;
    updateAge: number;
  };
  cookies: {
    sessionToken: {
      name: string;
      options: {
        httpOnly: boolean;
        sameSite: typeof SECURE_COOKIE_RULES.sameSite;
        path: string;
        secure: boolean;
      };
    };
  };
  callbacks: {
    jwt: (args: {
      token: Record<string, unknown>;
      user?: CustomerAuthUser | { id?: string | undefined };
    }) => Promise<Record<string, unknown>>;
    session: (args: {
      session: { user?: Record<string, unknown> } & Record<string, unknown>;
      token: Record<string, unknown>;
    }) => Promise<Record<string, unknown>>;
  };
  trustHost: boolean;
  secret?: string;
  adapter?: undefined;
};

function asCustomerAuthUser(
  user: CustomerAuthUser | { id?: string | undefined },
): CustomerAuthUser | null {
  if (
    typeof user.id === "string" &&
    "tokenVersion" in user &&
    typeof user.tokenVersion === "number" &&
    "role" in user &&
    user.role === "customer" &&
    "audience" in user &&
    user.audience === "customer"
  ) {
    return user as CustomerAuthUser;
  }
  return null;
}

export function createCustomerOtpAuthorize(
  deps: Pick<CreateCustomerAuthConfigDeps, "verifyOtp" | "resolveClaims">,
) {
  return async (
    raw:
      | Partial<
          Record<
            "phone" | "code" | "consentCheckboxAccepted" | "storeId",
            unknown
          >
        >
      | undefined,
  ): Promise<CustomerAuthUser | null> => {
    const phone = typeof raw?.phone === "string" ? raw.phone.trim() : "";
    const code = typeof raw?.code === "string" ? raw.code.trim() : "";
    const consentRaw = raw?.consentCheckboxAccepted;
    const consentCheckboxAccepted =
      consentRaw === true ||
      consentRaw === "true" ||
      consentRaw === "1" ||
      consentRaw === "on";
    const storeId =
      typeof raw?.storeId === "string" && raw.storeId.trim().length > 0
        ? raw.storeId.trim()
        : null;
    if (!phone || !code) {
      return null;
    }
    try {
      const verified = await deps.verifyOtp({
        phone,
        code,
        consentCheckboxAccepted,
        storeId,
      });
      const resolved = await deps.resolveClaims?.(verified);
      const claims = buildCustomerJwtClaims({
        customerIdentityId: verified.customerIdentityId,
        tokenVersion: verified.tokenVersion,
        // When resolveClaims runs (ADR-103), prefer UUID / null — never keep slug fallback.
        storeId: resolved
          ? (resolved.storeId ?? null)
          : (storeId ?? null),
      });
      return {
        id: claims.sub,
        role: claims.role,
        tokenVersion: claims.tokenVersion,
        storeId: claims.storeId,
        audience: claims.audience,
      };
    } catch {
      return null;
    }
  };
}

export function createCustomerAuthConfig(
  deps: CreateCustomerAuthConfigDeps,
): CustomerAuthJsConfig {
  const nodeEnv = deps.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const secure = sessionCookieSecure(nodeEnv);

  assertJwtSessionStrategy(NEXTAUTH_JWT_DECISION.strategy);
  assertNoDatabaseSessionStore(NEXTAUTH_JWT_DECISION.databaseSessionStore);
  assertShortSessionTtl(JWT_SESSION_TTL.maxAgeSeconds);
  assertSecureCookieOptions({
    httpOnly: SECURE_COOKIE_RULES.httpOnly,
    secure,
    sameSite: SECURE_COOKIE_RULES.sameSite,
    path: SECURE_COOKIE_RULES.path,
    nodeEnv,
  });

  const cookieName = secure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const authorize = createCustomerOtpAuthorize(deps);

  const config: CustomerAuthJsConfig = {
    providers: [
      Credentials({
        id: CUSTOMER_OTP_CREDENTIALS_BRIDGE.providerId,
        name: "Customer OTP",
        credentials: {
          phone: { label: "Phone", type: "text" },
          code: { label: "OTP", type: "text" },
          consentCheckboxAccepted: { label: "Consent", type: "text" },
          storeId: { label: "Store", type: "text" },
        },
        authorize,
      }),
    ],
    session: {
      strategy: NEXTAUTH_JWT_DECISION.strategy,
      maxAge: JWT_SESSION_TTL.maxAgeSeconds,
      updateAge: JWT_SESSION_TTL.updateAgeSeconds,
    },
    cookies: {
      sessionToken: {
        name: cookieName,
        options: {
          httpOnly: SECURE_COOKIE_RULES.httpOnly,
          sameSite: SECURE_COOKIE_RULES.sameSite,
          path: SECURE_COOKIE_RULES.path,
          secure,
        },
      },
    },
    callbacks: {
      jwt: async ({ token, user }) => {
        if (user) {
          const customerUser = asCustomerAuthUser(user);
          if (customerUser) {
            return applyCustomerClaimsToToken(token, customerUser);
          }
        }
        return token;
      },
      session: async ({ session, token }) => {
        return applyCustomerClaimsToSession(session, token);
      },
    },
    trustHost: NEXTAUTH_ENV.trustHost,
  };

  const secret =
    deps.secret ?? process.env[NEXTAUTH_ENV.secretEnv] ?? undefined;
  if (secret !== undefined && secret.length > 0) {
    config.secret = secret;
  }

  return config;
}
