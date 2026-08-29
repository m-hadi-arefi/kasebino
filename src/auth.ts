/**
 * ADR-095 — Auth.js App Router entry (handlers / auth / signIn / signOut).
 * Node runtime: Credentials OTP providers + merchant/customer verify.
 * ADR-156 — shared claim resolver + JWT incomplete-claim refresh.
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

import { authConfig } from "./auth.config.js";
import { createAppAuthConfig } from "./infrastructure/auth/create-app-auth-config.js";
import { bootstrapCustomerStoreSession } from "./infrastructure/auth/customer-session-bootstrap.js";
import { getOtpRuntime } from "./infrastructure/auth/otp-runtime.js";
import { resolveMerchantSessionClaims } from "./infrastructure/auth/resolve-merchant-session-claims.js";
import { getApiContext } from "./infrastructure/composition/index.js";

const runtime = () => getOtpRuntime();

function claimDeps(phones?: { national?: string; e164?: string }) {
  const api = getApiContext();
  return {
    merchants: api.repos.merchants,
    adminUsers: api.repos.adminUsers,
    staffMemberships: api.repos.staffMemberships,
    resolveEffectivePermissions: (roleIds: readonly string[]) =>
      api.roles.resolveEffectivePermissions(roleIds),
    adminLookupPhones: phones,
  };
}

const appConfig = createAppAuthConfig({
  merchant: {
    verifyOtp: (input) => runtime().merchant.verifyOtp(input),
    resolveClaims: async (verified) => {
      return resolveMerchantSessionClaims(verified.authUserId, claimDeps({
        national: verified.phoneNational,
        e164: verified.phoneE164,
      }));
    },
    refreshClaims: async (authUserId) => {
      return resolveMerchantSessionClaims(authUserId, claimDeps());
    },
    nodeEnv: process.env.NODE_ENV,
  },
  customer: {
    verifyOtp: (input) => runtime().customer.verifyOtp(input),
    resolveClaims: async (verified) => {
      const storeRef =
        typeof verified.event.payload.storeId === "string"
          ? verified.event.payload.storeId
          : null;
      const bootstrapped = await bootstrapCustomerStoreSession(getApiContext(), {
        verified,
        storeRef,
      });
      return { storeId: bootstrapped.storeId };
    },
    nodeEnv: process.env.NODE_ENV,
  },
});

const nextAuthConfig = {
  ...authConfig,
  ...appConfig,
  providers: appConfig.providers,
  callbacks: {
    ...authConfig.callbacks,
    jwt: appConfig.callbacks.jwt,
    session: appConfig.callbacks.session,
  },
} as unknown as NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(nextAuthConfig);
