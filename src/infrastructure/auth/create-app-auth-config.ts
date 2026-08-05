/**
 * ADR-095 — Merge merchant + customer Auth.js configs into one NextAuth() input.
 * Domain modules stay free of NextAuth handler wiring.
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

export type CreateAppAuthConfigDeps = {
  merchant: CreateMerchantAuthConfigDeps;
  customer: CreateCustomerAuthConfigDeps;
};

export type AppAuthUser = MerchantAuthUser | CustomerAuthUser | { id?: string };

export type AppAuthConfig = Omit<MerchantAuthJsConfig, "callbacks" | "providers"> & {
  providers: MerchantAuthJsConfig["providers"];
  callbacks: {
    jwt: (args: {
      token: Record<string, unknown>;
      user?: AppAuthUser;
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
      async jwt({ token, user }) {
        if (user) {
          if (isCustomerAuthUser(user)) {
            return applyCustomerClaimsToToken(token, user);
          }
          if (isMerchantAuthUser(user)) {
            return applyMerchantClaimsToToken(token, user);
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
