/**
 * ADR-095 — Edge-safe Auth.js config (middleware JWT decode).
 * No Credentials authorize / DB / OTP runtime imports.
 *
 * Note: excluded from contracts typecheck (NextAuth app surface).
 */

import type { NextAuthConfig } from "next-auth";

import {
  JWT_SESSION_TTL,
  NEXTAUTH_ENV,
  NEXTAUTH_JWT_DECISION,
  SECURE_COOKIE_RULES,
  sessionCookieSecure,
} from "./infrastructure/auth/contracts/nextauth-jwt/index.js";
import { applyCustomerClaimsToSession } from "./modules/customer-identity/infrastructure/auth/claims.js";
import { applyMerchantClaimsToSession } from "./modules/identity/infrastructure/auth/claims.js";

const nodeEnv = process.env.NODE_ENV ?? "development";
const secure = sessionCookieSecure(nodeEnv);
const cookieName = secure
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

/**
 * Shared session/cookie/callback surface for Edge middleware + Node handlers.
 * Providers are attached only in `src/auth.ts` (Node).
 */
export const authConfig = {
  providers: [],
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
  trustHost: NEXTAUTH_ENV.trustHost,
  callbacks: {
    async session({ session, token }) {
      const record = token as Record<string, unknown>;
      if (record.audience === "customer" || record.role === "customer") {
        return applyCustomerClaimsToSession(
          session as unknown as {
            user?: Record<string, unknown>;
          } & Record<string, unknown>,
          record,
        ) as unknown as typeof session;
      }
      return applyMerchantClaimsToSession(
        session as unknown as {
          user?: Record<string, unknown>;
        } & Record<string, unknown>,
        record,
      ) as unknown as typeof session;
    },
    authorized() {
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
