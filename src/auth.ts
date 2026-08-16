/**
 * ADR-095 — Auth.js App Router entry (handlers / auth / signIn / signOut).
 * Node runtime: Credentials OTP providers + merchant/customer verify.
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

import { authConfig } from "./auth.config.js";
import { createAppAuthConfig } from "./infrastructure/auth/create-app-auth-config.js";
import { bootstrapCustomerStoreSession } from "./infrastructure/auth/customer-session-bootstrap.js";
import { getOtpRuntime } from "./infrastructure/auth/otp-runtime.js";
import { getApiContext } from "./infrastructure/composition/index.js";

import { ROLE_PERMISSION_MATRIX } from "./rbac/index.js";

const runtime = () => getOtpRuntime();

const appConfig = createAppAuthConfig({
  merchant: {
    verifyOtp: (input) => runtime().merchant.verifyOtp(input),
    resolveClaims: async (verified) => {
      const api = getApiContext();
      const merchant = await api.repos.merchants.findByOwnerUserId(
        verified.authUserId,
      );
      if (merchant) {
        return {
          merchantId: merchant.id,
          roles: ["merchant_owner"],
          permissions: [...ROLE_PERMISSION_MATRIX.merchant_owner],
          storeIds: [],
        };
      }
      
      const staffMemberships = await api.repos.staffMemberships.findByAuthUserId(
        verified.authUserId,
      );
      if (staffMemberships.length > 0) {
        const active = staffMemberships.find((m) => m.membership.status === "active") ?? staffMemberships[0];
        if (active && active.membership.status === "active") {
          const roleIds = active.roleIds && active.roleIds.length > 0
            ? active.roleIds
            : [active.membership.role];
          const effectivePermissions = await api.roles.resolveEffectivePermissions(roleIds);

          return {
            merchantId: active.membership.merchantId,
            roles: roleIds,
            permissions: Array.from(effectivePermissions),
            storeIds: active.storeScopes.map((s) => s.storeId),
          };
        }
      }

      return { merchantId: null, roles: [], permissions: [], storeIds: [] };
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
