/**
 * ADR-033 — Auth.js (next-auth v5) JWT config stub for merchant OTP.
 *
 * Credentials provider bridges ADR-031 verifyOtp → JWT claims.
 * Folder convention: docs/tech/nextauth.md → identity/infrastructure/auth
 */

import Credentials from "next-auth/providers/credentials";

import {
  JWT_SESSION_TTL,
  NEXTAUTH_ENV,
  NEXTAUTH_JWT_DECISION,
  OTP_CREDENTIALS_BRIDGE,
  SECURE_COOKIE_RULES,
  assertJwtSessionStrategy,
  assertNoDatabaseSessionStore,
  assertSecureCookieOptions,
  assertShortSessionTtl,
  buildMerchantJwtClaims,
  sessionCookieSecure,
} from "../../../../infrastructure/auth/contracts/nextauth-jwt/index.js";
import type { VerifyMerchantOtpResult } from "../../application/merchant-otp-use-cases.js";
import {
  applyMerchantClaimsToSession,
  applyMerchantClaimsToToken,
  type MerchantAuthUser,
} from "./claims.js";

export type {
  MerchantAuthUser,
} from "./claims.js";
export {
  applyMerchantClaimsToSession,
  applyMerchantClaimsToToken,
} from "./claims.js";

export type ResolveMerchantClaims = (
  verified: VerifyMerchantOtpResult,
) =>
  | {
      merchantId?: string | null;
      roles?: readonly string[];
      permissions?: readonly string[];
      storeIds?: readonly string[];
    }
  | Promise<{
      merchantId?: string | null;
      roles?: readonly string[];
      permissions?: readonly string[];
      storeIds?: readonly string[];
    }>;

export type CreateMerchantAuthConfigDeps = {
  verifyOtp: (input: {
    phone: string;
    code: string;
  }) => Promise<VerifyMerchantOtpResult>;
  resolveClaims?: ResolveMerchantClaims;
  secret?: string;
  nodeEnv?: string;
};

export type MerchantAuthJsConfig = {
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
      user?: MerchantAuthUser | { id?: string | undefined };
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

function asMerchantAuthUser(
  user: MerchantAuthUser | { id?: string | undefined },
): MerchantAuthUser | null {
  if (
    typeof user.id === "string" &&
    "tokenVersion" in user &&
    typeof user.tokenVersion === "number" &&
    "merchantId" in user &&
    "roles" in user &&
    Array.isArray(user.roles)
  ) {
    return user as MerchantAuthUser;
  }
  return null;
}

export function createMerchantOtpAuthorize(
  deps: Pick<CreateMerchantAuthConfigDeps, "verifyOtp" | "resolveClaims">,
) {
  return async (
    raw: Partial<Record<"phone" | "code", unknown>> | undefined,
  ): Promise<MerchantAuthUser | null> => {
    const phone = typeof raw?.phone === "string" ? raw.phone.trim() : "";
    const code = typeof raw?.code === "string" ? raw.code.trim() : "";
    if (!phone || !code) {
      return null;
    }
    try {
      const verified = await deps.verifyOtp({ phone, code });
      const resolved = (await deps.resolveClaims?.(verified)) ?? {};
      const claims = buildMerchantJwtClaims({
        authUserId: verified.authUserId,
        tokenVersion: verified.tokenVersion,
        merchantId: resolved.merchantId ?? null,
        roles: resolved.roles ?? [],
        permissions: resolved.permissions ?? [],
        storeIds: resolved.storeIds ?? [],
      });
      return {
        id: claims.sub,
        merchantId: claims.merchantId,
        roles: [...claims.roles],
        permissions: claims.permissions ? [...claims.permissions] : [],
        storeIds: [...claims.storeIds],
        tokenVersion: claims.tokenVersion,
      };
    } catch {
      return null;
    }
  };
}

export function createMerchantAuthConfig(
  deps: CreateMerchantAuthConfigDeps,
): MerchantAuthJsConfig {
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

  const authorize = createMerchantOtpAuthorize(deps);

  const config: MerchantAuthJsConfig = {
    providers: [
      Credentials({
        id: OTP_CREDENTIALS_BRIDGE.providerId,
        name: "Merchant OTP",
        credentials: {
          phone: { label: "Phone", type: "text" },
          code: { label: "OTP", type: "text" },
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
          const merchantUser = asMerchantAuthUser(user);
          if (merchantUser) {
            return applyMerchantClaimsToToken(token, merchantUser);
          }
        }
        return token;
      },
      session: async ({ session, token }) => {
        return applyMerchantClaimsToSession(session, token);
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

/**
 * App Router wiring (ADR-095):
 * `NextAuth(createAppAuthConfig(...))` → export handlers GET/POST from `@/auth`.
 */
export const NEXTAUTH_APP_ROUTER_WIRE_HINT =
  "NextAuth(createMerchantAuthConfig(deps)+customer) → export handlers GET/POST" as const;
