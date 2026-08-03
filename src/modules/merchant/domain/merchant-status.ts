/**
 * Merchant status value object helpers (ADR-005).
 */

export const MERCHANT_STATUSES = ["draft", "active", "suspended"] as const;
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

export function isMerchantStatus(value: string): value is MerchantStatus {
  return (MERCHANT_STATUSES as readonly string[]).includes(value);
}

/** Merchant self-activation / onboarding — draft only. */
export function canActivateFrom(status: MerchantStatus): boolean {
  return status === "draft";
}

/** Platform admin activate/reactivate — draft or suspended (ADR-013). */
export function canAdminActivateFrom(status: MerchantStatus): boolean {
  return status === "draft" || status === "suspended";
}

/** Platform admin suspend — active only (ADR-013). */
export function canSuspendFrom(status: MerchantStatus): boolean {
  return status === "active";
}

export function isSuspended(status: MerchantStatus): boolean {
  return status === "suspended";
}
