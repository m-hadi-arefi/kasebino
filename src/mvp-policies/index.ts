/**
 * ADR-091 — MVP product policy resolutions (PRD §19).
 * Domain ADRs must honor these defaults; contradicting behavior needs a superseding ADR.
 */

import {
  MULTI_STORE,
  STOREFRONT_URL,
  buildStorefrontPath,
} from "../product-architecture/index.js";

export { MULTI_STORE, STOREFRONT_URL, buildStorefrontPath };

/** §1 Multi-store — already encoded on product-architecture; re-assert here. */
export const MULTI_STORE_POLICY = {
  ...MULTI_STORE,
  merchantUiMustSupport: ["create", "list", "switch", "manage"] as const,
} as const;

/** §2 Loyalty expiry */
export const LOYALTY_EXPIRY_POLICY = {
  defaultMode: "months_after_last_earn",
  defaultMonthsAfterLastEarn: 12,
  merchantConfigurable: true,
  canDisableExpiry: true,
  ledgerAppendOnly: true,
  expiryEventName: "PointsExpired",
} as const;

/** §3 Customer phone consent */
export const PHONE_CONSENT_POLICY = {
  pos: {
    pattern: "notice_continue_equals_consent",
    mandatoryCheckbox: false,
    noticeLanguage: "fa",
  },
  customerDigital: {
    pattern: "explicit_checkbox_before_otp",
    mandatoryCheckbox: true,
    noticeLanguage: "fa",
  },
} as const;

/** §4 POS tender recording */
export const POS_TENDER_TYPES = ["cash", "card_terminal", "mixed"] as const;
export type PosTenderType = (typeof POS_TENDER_TYPES)[number];

export const POS_TENDER_POLICY = {
  requiredOnSale: true,
  allowed: POS_TENDER_TYPES,
  /** Card terminal settlement is outside MerchantOS MVP. */
  cardAcquiringInScope: false,
  persianLabels: {
    cash: "نقد",
    card_terminal: "کارت‌خوان",
    mixed: "ترکیبی",
  } as const,
} as const;

/** §5 Pickup time policies */
export const PICKUP_TIMER_POLICY = {
  unpaidPendingPaymentTimeoutMinutes: 30,
  unpaidTimeoutResultStatus: "cancelled",
  readyForPickupHoldHours: 24,
  noShowSilentRefund: false,
  refundRequiresExplicitStaffAction: true,
} as const;

/** §6 Storefront URL — path-based MVP */
export const STOREFRONT_URL_POLICY = {
  ...STOREFRONT_URL,
  slugGloballyUnique: true,
  qrEncodesCanonicalUrl: true,
  qrSourceQuery: "src=qr",
  subdomainsInMvp: false,
} as const;

/** §7 Store map presentation */
export const STORE_MAP_POLICY = {
  persistStructuredAddress: true,
  persistLatLng: true,
  presentation: "static_map_image_plus_navigate",
  interactiveEmbedMandatory: false,
  navigateDeepLinks: ["google", "neshan", "apple", "geo"] as const,
} as const;

/** §8 SMS / PSP remain Proposed — ports + mocks only */
export const VENDOR_POLICY = {
  smsProviderAdr: "ADR-083",
  pspAdr: "ADR-084",
  decisionStatus: "proposed",
  implementationAllowed: "ports_and_mocks_only",
} as const;

/** §9 Phase-1 monetization — free Kerman pilot */
export const MONETIZATION_POLICY = {
  phase1Stance: "free_kerman_pilot",
  chargeSaasFeeInPilot: false,
  chargeTxFeeInPilot: false,
  persianPilotCopy: "پایلوت رایگان کرمان",
  instrumentForLaterPricing: ["gmv", "dam", "mam"] as const,
} as const;

/** §10 Offline conflicts (restate ADR-024) */
export const OFFLINE_CONFLICT_POLICY = {
  onlinePathPriority: "P0",
  offlineQueuePriority: "P1",
  stockShortageConflict: "reject_and_review",
  idempotentSyncKeys: true,
} as const;

export function isPosTenderType(value: string): value is PosTenderType {
  return (POS_TENDER_TYPES as readonly string[]).includes(value);
}

export function assertPosTenderType(value: string): asserts value is PosTenderType {
  if (!isPosTenderType(value)) {
    throw new Error(
      `Unknown POS tender "${value}". Allowed: ${POS_TENDER_TYPES.join(", ")} (ADR-091).`,
    );
  }
}

export function assertCustomerOtpConsent(opts: { checkboxAccepted: boolean }): void {
  if (!opts.checkboxAccepted) {
    throw new Error(
      "Explicit consent checkbox required before customer OTP (ADR-091).",
    );
  }
}

export function unpaidOrderShouldAutoCancel(ageMinutes: number): boolean {
  return ageMinutes >= PICKUP_TIMER_POLICY.unpaidPendingPaymentTimeoutMinutes;
}

export function readyHoldShouldExpire(ageHours: number): boolean {
  return ageHours >= PICKUP_TIMER_POLICY.readyForPickupHoldHours;
}

export const MVP_POLICIES = {
  multiStore: MULTI_STORE_POLICY,
  loyaltyExpiry: LOYALTY_EXPIRY_POLICY,
  phoneConsent: PHONE_CONSENT_POLICY,
  posTender: POS_TENDER_POLICY,
  pickupTimers: PICKUP_TIMER_POLICY,
  storefrontUrl: STOREFRONT_URL_POLICY,
  storeMap: STORE_MAP_POLICY,
  vendors: VENDOR_POLICY,
  monetization: MONETIZATION_POLICY,
  offlineConflicts: OFFLINE_CONFLICT_POLICY,
} as const;
