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

import { ROLE_PERMISSION_MATRIX } from "./infrastructure/security/rbac/index.js";

const runtime = () => getOtpRuntime();

const appConfig = createAppAuthConfig({
  merchant: {
    verifyOtp: (input) => runtime().merchant.verifyOtp(input),
    resolveClaims: async (verified) => {
      const api = getApiContext();
      if (api.repos.adminUsers) {
        const admin =
          (await api.repos.adminUsers.findById(verified.authUserId)) ??
          (await api.repos.adminUsers.findByLogin(verified.phoneNational)) ??
          (await api.repos.adminUsers.findByLogin(verified.phoneE164));
        if (admin && admin.status === "active") {
          if (admin.id !== verified.authUserId) {
            const existingForSub = await api.repos.adminUsers.findById(verified.authUserId);
            if (!existingForSub) {
              await api.repos.adminUsers.save({
                id: verified.authUserId,
                login: `${admin.login}_${verified.authUserId.slice(0, 8)}`,
                displayName: admin.displayName,
                status: "active",
                role: "platform_admin",
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }
          return {
            merchantId: null,
            roles: ["platform_admin"],
            permissions: [...ROLE_PERMISSION_MATRIX.platform_admin],
            storeIds: [],
          };
        }
      }

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
      
      if (api.repos.staffMemberships) {
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
