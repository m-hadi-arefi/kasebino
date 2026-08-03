/**
 * ADR-033 — Auth.js (next-auth v5) JWT config stub for merchant OTP.
 *
 * Credentials provider bridges ADR-031 verifyOtp → JWT claims.
 * No Route Handler / UI this cycle — App Router wires NextAuth(config) later.
 *
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
  type MerchantJwtClaims,
} from "../../../../nextauth-jwt/index.js";
import type { VerifyMerchantOtpResult } from "../../application/merchant-otp-use-cases.js";

/** User payload returned from Credentials authorize → jwt callback. */
export type MerchantAuthUser = {
  id: string;
  merchantId: string | null;
  roles: string[];
  tokenVersion: number;
};

export type ResolveMerchantClaims = (verified: VerifyMerchantOtpResult) => {
  merchantId?: string | null;
  roles?: readonly string[];
};

export type CreateMerchantAuthConfigDeps = {
  /** ADR-031 verify use case (injected; no coupling to concrete repos). */
  verifyOtp: (input: {
    phone: string;
    code: string;
  }) => Promise<VerifyMerchantOtpResult>;
  /** Merchant link + role assignment (ADR-034 RBAC / ADR-005 membership). */
  resolveClaims?: ResolveMerchantClaims;
  /** Defaults to process.env.AUTH_SECRET. */
  secret?: string;
  /** Inject for tests — defaults to process.env.NODE_ENV. */
  nodeEnv?: string;
};

/**
 * Minimal Auth.js-compatible config (JWT strategy, no database adapter).
 * Pass to `NextAuth(...)` from App Router when handlers land.
 */
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
  /** Explicitly absent — database sessions forbidden. */
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

/**
 * Apply OTP verify result (+ optional claim placeholders) onto Auth.js JWT token.
 */
export function applyMerchantClaimsToToken(
  token: Record<string, unknown>,
  user: MerchantAuthUser,
): Record<string, unknown> {
  const claims = buildMerchantJwtClaims({
    authUserId: user.id,
    tokenVersion: user.tokenVersion,
    merchantId: user.merchantId,
    roles: user.roles,
  });
  return {
    ...token,
    sub: claims.sub,
    merchantId: claims.merchantId,
    roles: [...claims.roles],
    tokenVersion: claims.tokenVersion,
  };
}

/**
 * Expose JWT claims on the session object for server/client consumers.
 */
export function applyMerchantClaimsToSession(
  session: { user?: Record<string, unknown> } & Record<string, unknown>,
  token: Record<string, unknown>,
): Record<string, unknown> {
  const claims: MerchantJwtClaims = buildMerchantJwtClaims({
    authUserId: String(token.sub ?? ""),
    tokenVersion:
      typeof token.tokenVersion === "number" ? token.tokenVersion : 0,
    merchantId:
      token.merchantId === null || typeof token.merchantId === "string"
        ? (token.merchantId as string | null)
        : null,
    roles: Array.isArray(token.roles)
      ? (token.roles as string[])
      : [],
  });

  const user = {
    ...(session.user ?? {}),
    id: claims.sub,
    merchantId: claims.merchantId,
    roles: [...claims.roles],
    tokenVersion: claims.tokenVersion,
  };

  return {
    ...session,
    user,
    merchantId: claims.merchantId,
    roles: [...claims.roles],
    tokenVersion: claims.tokenVersion,
  };
}

/**
 * Credentials `authorize` bridge — OTP verify → merchant JWT user payload.
 * Auth.js stores this under provider.options; NextAuth merges at runtime.
 */
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
      const resolved = deps.resolveClaims?.(verified) ?? {};
      const claims = buildMerchantJwtClaims({
        authUserId: verified.authUserId,
        tokenVersion: verified.tokenVersion,
        merchantId: resolved.merchantId ?? null,
        roles: resolved.roles ?? [],
      });
      return {
        id: claims.sub,
        merchantId: claims.merchantId,
        roles: [...claims.roles],
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
 * App Router wiring reminder (handlers not created this ADR):
 *
 * ```ts
 * import NextAuth from "next-auth";
 * import { createMerchantAuthConfig } from "@/modules/identity/infrastructure/auth";
 * export const { handlers, auth, signIn, signOut } = NextAuth(
 *   createMerchantAuthConfig({ verifyOtp: useCases.verifyOtp }),
 * );
 * ```
 */
export const NEXTAUTH_APP_ROUTER_WIRE_HINT =
  "NextAuth(createMerchantAuthConfig(deps)) → export handlers GET/POST" as const;
