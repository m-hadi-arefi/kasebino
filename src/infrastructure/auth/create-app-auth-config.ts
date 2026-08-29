/**
 * ADR-095 / ADR-156 — Merge merchant + customer Auth.js configs into one NextAuth() input.
 * Domain modules stay free of NextAuth handler wiring.
 * ADR-156: JWT callback re-resolves incomplete merchant claims after onboarding/staff.
 */

import {
  applyCustomerClaimsToSession,
  applyCustomerClaimsToToken,
  createCustomerAuthConfig,
  type CreateCustomerAuthConfigDeps,
  type CustomerAuthUser,
} from "../../modules/customer-identity/infrastructure/auth/index.js";
import {
  applyMerchantClaimsToSession,
  applyMerchantClaimsToToken,
  createMerchantAuthConfig,
  type CreateMerchantAuthConfigDeps,
  type MerchantAuthJsConfig,
  type MerchantAuthUser,
} from "../../modules/identity/infrastructure/auth/index.js";
import {
  merchantClaimsNeedRefresh,
  type MerchantSessionClaims,
} from "./resolve-merchant-session-claims.js";

export type CreateAppAuthConfigDeps = {
  merchant: CreateMerchantAuthConfigDeps & {
    /**
     * ADR-156 — when merchant JWT has null merchantId or empty roles,
     * re-resolve from ownership / staff membership (no OTP required).
     */
    refreshClaims?: (
      authUserId: string,
    ) => Promise<MerchantSessionClaims | null>;
  };
  customer: CreateCustomerAuthConfigDeps;
};

export type AppAuthUser = MerchantAuthUser | CustomerAuthUser | { id?: string };

export type AppAuthConfig = Omit<MerchantAuthJsConfig, "callbacks" | "providers"> & {
  providers: MerchantAuthJsConfig["providers"];
  callbacks: {
    jwt: (args: {
      token: Record<string, unknown>;
      user?: AppAuthUser;
      trigger?: "signIn" | "signUp" | "update";
    }) => Promise<Record<string, unknown>>;
    session: (args: {
      session: { user?: Record<string, unknown> } & Record<string, unknown>;
      token: Record<string, unknown>;
    }) => Promise<Record<string, unknown>>;
  };
};

function isCustomerAuthUser(user: unknown): user is CustomerAuthUser {
  return (
    typeof user === "object" &&
    user !== null &&
    "audience" in user &&
    (user as CustomerAuthUser).audience === "customer" &&
    "role" in user &&
    (user as CustomerAuthUser).role === "customer"
  );
}

function isMerchantAuthUser(user: unknown): user is MerchantAuthUser {
  return (
    typeof user === "object" &&
    user !== null &&
    "tokenVersion" in user &&
    typeof (user as MerchantAuthUser).tokenVersion === "number" &&
    "merchantId" in user &&
    "roles" in user &&
    Array.isArray((user as MerchantAuthUser).roles)
  );
}

/**
 * Build a NextAuth-compatible config with both OTP Credential providers.
 */
export function createAppAuthConfig(
  deps: CreateAppAuthConfigDeps,
): AppAuthConfig {
  const merchant = createMerchantAuthConfig(deps.merchant);
  const customer = createCustomerAuthConfig(deps.customer);

  const config: AppAuthConfig = {
    providers: [...merchant.providers, ...customer.providers],
    session: merchant.session,
    cookies: merchant.cookies,
    trustHost: merchant.trustHost,
    callbacks: {
      async jwt({ token, user, trigger }) {
        if (user) {
          if (isCustomerAuthUser(user)) {
            return applyCustomerClaimsToToken(token, user);
          }
          if (isMerchantAuthUser(user)) {
            return applyMerchantClaimsToToken(token, user);
          }
        }

        const isMerchantAudience =
          token.audience === "merchant" ||
          (token.audience !== "customer" &&
            token.role !== "customer" &&
            typeof token.sub === "string");

        const shouldRefresh =
          isMerchantAudience &&
          typeof token.sub === "string" &&
          deps.merchant.refreshClaims &&
          (trigger === "update" || merchantClaimsNeedRefresh(token));

        if (shouldRefresh && deps.merchant.refreshClaims) {
          const resolved = await deps.merchant.refreshClaims(token.sub as string);
          if (
            resolved &&
            (resolved.merchantId ||
              resolved.roles.length > 0 ||
              resolved.permissions.length > 0)
          ) {
            return applyMerchantClaimsToToken(token, {
              id: token.sub as string,
              merchantId: resolved.merchantId,
              roles: resolved.roles,
              permissions: resolved.permissions,
              storeIds: resolved.storeIds,
              tokenVersion:
                typeof token.tokenVersion === "number" ? token.tokenVersion : 0,
            });
          }
        }

        return token;
      },
      async session({ session, token }) {
        if (token.audience === "customer" || token.role === "customer") {
          return applyCustomerClaimsToSession(session, token);
        }
        return applyMerchantClaimsToSession(session, token);
      },
    },
  };

  if (merchant.secret !== undefined) {
    config.secret = merchant.secret;
  } else if (customer.secret !== undefined) {
    config.secret = customer.secret;
  }

  return config;
}
