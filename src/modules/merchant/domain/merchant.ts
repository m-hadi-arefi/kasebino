/**
 * Merchant aggregate root (ADR-005).
 * Multi-tenant root; MVP multi-store enabled (ADR-091).
 */

import type { MerchantStatus } from "./merchant-status.js";

/** Stub settings shell — expand with billing/prefs later. */
export type MerchantSettings = {
  readonly localeDefault: "fa-IR";
  readonly displayTimezone: "Asia/Tehran";
};

export const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  localeDefault: "fa-IR",
  displayTimezone: "Asia/Tehran",
};

export type Merchant = {
  readonly id: string;
  /** Persian-capable trade / display name. */
  tradeName: string;
  /** Globally unique URL-safe slug (merchant identity; stores have own slugs). */
  slug: string;
  status: MerchantStatus;
  readonly ownerUserId: string;
  contactPhoneNational: string | null;
  contactPhoneE164: string | null;
  /** Always true in MVP (ADR-091). */
  readonly multiStoreEnabled: true;
  settings: MerchantSettings;
  readonly createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
};

export type CreateMerchantAggregateInput = {
  id: string;
  tradeName: string;
  slug: string;
  ownerUserId: string;
  contactPhoneNational?: string | null;
  contactPhoneE164?: string | null;
  settings?: MerchantSettings;
  now?: Date;
};

export function createMerchantAggregate(
  input: CreateMerchantAggregateInput,
): Merchant {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    tradeName: input.tradeName,
    slug: input.slug,
    status: "draft",
    ownerUserId: input.ownerUserId,
    contactPhoneNational: input.contactPhoneNational ?? null,
    contactPhoneE164: input.contactPhoneE164 ?? null,
    multiStoreEnabled: true,
    settings: input.settings ?? { ...DEFAULT_MERCHANT_SETTINGS },
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
  };
}

export function activateMerchantAggregate(
  merchant: Merchant,
  at: Date = new Date(),
): void {
  merchant.status = "active";
  merchant.activatedAt = at;
  merchant.updatedAt = at;
}

/** Platform admin suspend — stops POS/storefront gates (ADR-013). */
export function suspendMerchantAggregate(
  merchant: Merchant,
  at: Date = new Date(),
): void {
  merchant.status = "suspended";
  merchant.updatedAt = at;
}

export function applyMerchantProfile(
  merchant: Merchant,
  patch: {
    tradeName?: string;
    slug?: string;
    contactPhoneNational?: string | null;
    contactPhoneE164?: string | null;
    settings?: Partial<MerchantSettings>;
  },
  at: Date = new Date(),
): string[] {
  const changed: string[] = [];
  if (patch.tradeName !== undefined && patch.tradeName !== merchant.tradeName) {
    merchant.tradeName = patch.tradeName;
    changed.push("tradeName");
  }
  if (patch.slug !== undefined && patch.slug !== merchant.slug) {
    merchant.slug = patch.slug;
    changed.push("slug");
  }
  if (
    patch.contactPhoneNational !== undefined &&
    patch.contactPhoneNational !== merchant.contactPhoneNational
  ) {
    merchant.contactPhoneNational = patch.contactPhoneNational;
    changed.push("contactPhoneNational");
  }
  if (
    patch.contactPhoneE164 !== undefined &&
    patch.contactPhoneE164 !== merchant.contactPhoneE164
  ) {
    merchant.contactPhoneE164 = patch.contactPhoneE164;
    changed.push("contactPhoneE164");
  }
  if (patch.settings !== undefined) {
    merchant.settings = {
      ...merchant.settings,
      ...patch.settings,
      localeDefault: "fa-IR",
      displayTimezone: "Asia/Tehran",
    };
    changed.push("settings");
  }
  if (changed.length > 0) {
    merchant.updatedAt = at;
  }
  return changed;
}
