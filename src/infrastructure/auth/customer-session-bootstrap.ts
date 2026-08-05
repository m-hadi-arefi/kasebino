/**
 * ADR-103 — After customer OTP verify: resolve storefront store + join membership.
 * Keeps Auth.js authorize path free of Next.js imports.
 */

import type { ApiContext } from "../composition/create-api-context.js";
import type { VerifyCustomerOtpResult } from "../../modules/customer-identity/application/customer-otp-use-cases.js";
import { enqueueDomainEvent } from "../http/enqueue-domain-event.js";

export type CustomerSessionBootstrapInput = {
  verified: VerifyCustomerOtpResult;
  /** Login form may pass storefront slug or store UUID. */
  storeRef?: string | null;
};

export type CustomerSessionBootstrapResult = {
  storeId: string | null;
  membershipId: string | null;
};

/**
 * Resolve active store by slug or id; link StoreMembership with digital consent
 * already validated at OTP verify (FR-4 / FR-5).
 */
export async function bootstrapCustomerStoreSession(
  ctx: ApiContext,
  input: CustomerSessionBootstrapInput,
): Promise<CustomerSessionBootstrapResult> {
  const ref = input.storeRef?.trim() || null;
  if (!ref) {
    return { storeId: null, membershipId: null };
  }

  let store = await ctx.repos.stores.findBySlug(ref);
  if (!store) {
    store = await ctx.repos.stores.findById(ref);
  }
  if (!store || store.status !== "active") {
    return { storeId: null, membershipId: null };
  }

  const merchant = await ctx.repos.merchants.findById(store.merchantId);
  if (!merchant || merchant.status !== "active") {
    return { storeId: null, membershipId: null };
  }

  const joined = await ctx.crm.joinWithDigitalConsent({
    merchantId: store.merchantId,
    storeId: store.id,
    phone: input.verified.phoneNational,
    source: "storefront",
    consentCheckboxAccepted: true,
  });

  if (joined.event) {
    await enqueueDomainEvent({
      outbox: ctx.outbox,
      cache: ctx.cache,
      notifications: ctx.notifications,
      domainEvent: joined.event,
      merchantId: store.merchantId,
      storeId: store.id,
    });
  }

  return {
    storeId: store.id,
    membershipId: joined.membership.id,
  };
}
