/**
 * ADR-007 — Customer Membership Model contract.
 *
 * StoreMembership is first-class: each store owns its customer base.
 * Wallets stay membership/store-scoped (loyalty → ADR-010).
 * Customer identity (phone) is separate from merchant AuthUser.
 * Consent surfaces: POS notice-continue vs digital checkbox (ADR-091).
 */

import { PHONE_CONSENT_POLICY } from "../../../../shared/contracts/mvp-policies/index.js";

export { PHONE_CONSENT_POLICY };

export const MEMBERSHIP_SOURCES = [
  "pos",
  "qr",
  "storefront",
  "pickup",
] as const;
export type MembershipSource = (typeof MEMBERSHIP_SOURCES)[number];

export const MEMBERSHIP_STATUSES = [
  "active",
  "suspended",
  "inactive",
] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** Consent capture surfaces (ADR-091 §3). */
export const CONSENT_SURFACES = [
  "pos_notice_continue",
  "digital_checkbox",
] as const;
export type ConsentSurface = (typeof CONSENT_SURFACES)[number];

/**
 * Binding decision snapshot (ADR-007 + ADR-091 phone consent).
 */
export const CRM_MEMBERSHIP_DECISION = {
  aggregate: "StoreMembership",
  module: "crm",
  customerIdentitySeparateFromMerchantAuth: true,
  uniqueKey: "store_id_phone_active",
  storeScoped: true,
  walletsScopedTo: "membership" as const,
  sources: MEMBERSHIP_SOURCES,
  statuses: MEMBERSHIP_STATUSES,
  softDeleteHidesFromDefaultLists: true,
  consent: {
    pos: PHONE_CONSENT_POLICY.pos,
    customerDigital: PHONE_CONSENT_POLICY.customerDigital,
    surfaces: CONSENT_SURFACES,
    /** Versionable Persian notice — counsel may revise copy without UX change. */
    defaultNoticeVersion: "pos-consent-v1",
    defaultDigitalCheckboxVersion: "digital-consent-v1",
  },
  events: ["MembershipCreated", "MembershipUpdated"] as const,
  joinFunnelAnalyticsBySource: true,
} as const;

export const CRM_MEMBERSHIP_EVENTS =
  CRM_MEMBERSHIP_DECISION.events;

export type CrmMembershipEventName =
  (typeof CRM_MEMBERSHIP_EVENTS)[number];

/** Cache policy notes — Redis adapter later (ADR-051/053). */
export const MEMBERSHIP_CACHE = {
  keyHint: "mos:{env}:{merchantId}:store:{storeId}:membership:{membershipId}",
  phoneKeyHint:
    "mos:{env}:{merchantId}:store:{storeId}:membership:phone:{phoneNational}",
  ttlSeconds: 300,
  invalidateOn: CRM_MEMBERSHIP_EVENTS,
} as const;

/**
 * Canonical Persian POS phone-capture notice (ADR-091 notice-continue).
 * Present at counter; continuing checkout records consent — no mandatory checkbox.
 */
export const POS_PHONE_CONSENT_NOTICE_FA =
  "با ادامهٔ خرید، ذخیرهٔ شماره برای باشگاه مشتریان و ارتباط فروشگاه را می‌پذیرید.";

/**
 * Canonical Persian digital consent checkbox label (PWA / storefront OTP).
 */
export const DIGITAL_CONSENT_CHECKBOX_LABEL_FA =
  "ذخیره و استفاده از شماره‌ام برای عضویت و پیام‌های فروشگاه را می‌پذیرم.";

export function assertMembershipSource(
  value: string,
): asserts value is MembershipSource {
  if (!(MEMBERSHIP_SOURCES as readonly string[]).includes(value)) {
    throw new Error(
      `Invalid membership source "${value}" (ADR-007). Allowed: ${MEMBERSHIP_SOURCES.join(", ")}.`,
    );
  }
}

export function isDigitalMembershipSource(
  source: MembershipSource,
): boolean {
  return source === "qr" || source === "storefront" || source === "pickup";
}

export const CRM_MEMBERSHIP = {
  decision: CRM_MEMBERSHIP_DECISION,
  events: CRM_MEMBERSHIP_EVENTS,
  cache: MEMBERSHIP_CACHE,
  consentPolicy: PHONE_CONSENT_POLICY,
  posNoticeFa: POS_PHONE_CONSENT_NOTICE_FA,
  digitalCheckboxLabelFa: DIGITAL_CONSENT_CHECKBOX_LABEL_FA,
} as const;
