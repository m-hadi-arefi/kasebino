/**
 * Merchant Subscription Plans, Fee Rules, and Feature Flags Domain Types (ADR-153).
 */

export const PLAN_CODES = ["pilot", "free", "pro", "enterprise"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const PLAN_NAMES_FA: Record<PlanCode, string> = {
  pilot: "پایلوت رایگان",
  free: "رایگان پایه",
  pro: "حرفه‌ای",
  enterprise: "سازمانی",
};

export const FEATURE_FLAG_KEYS = [
  "advanced_analytics",
  "sms_campaigns",
  "multi_store",
  "loyalty_advanced",
  "custom_receipts",
  "accounting_sync",
  "inventory_valuation",
] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export const FEATURE_NAMES_FA: Record<FeatureFlagKey, string> = {
  advanced_analytics: "گزارش‌ها و تحلیل پیشرفته",
  sms_campaigns: "ارسال پیامک و کمپین‌های بازاریابی",
  multi_store: "مدیریت چندشعبه‌ای",
  loyalty_advanced: "باشگاه مشتریان پیشرفته",
  custom_receipts: "شخصی‌سازی فاکتور و رسید دیجیتال",
  accounting_sync: "همگام‌سازی خودکار با سیستم حسابداری",
  inventory_valuation: "محاسبه بهای تمام‌شده و ارزش‌گذاری انبار",
};

export const DEFAULT_PLAN_FEATURES: Record<PlanCode, readonly FeatureFlagKey[]> = {
  pilot: [
    "advanced_analytics",
    "sms_campaigns",
    "multi_store",
    "loyalty_advanced",
    "custom_receipts",
    "accounting_sync",
    "inventory_valuation",
  ],
  free: ["custom_receipts"],
  pro: [
    "advanced_analytics",
    "sms_campaigns",
    "loyalty_advanced",
    "custom_receipts",
    "inventory_valuation",
  ],
  enterprise: [
    "advanced_analytics",
    "sms_campaigns",
    "multi_store",
    "loyalty_advanced",
    "custom_receipts",
    "accounting_sync",
    "inventory_valuation",
  ],
};

export type MerchantSubscription = {
  readonly id: string;
  readonly merchantId: string;
  planCode: PlanCode;
  /** Basis points transaction fee (e.g. 0 for pilot, 150 = 1.5%). Default 0. */
  feeBps: number;
  /** Custom feature overrides or active features. */
  features: readonly FeatureFlagKey[];
  startsAt: Date;
  expiresAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreateMerchantSubscriptionInput = {
  id: string;
  merchantId: string;
  planCode?: PlanCode;
  feeBps?: number;
  features?: readonly FeatureFlagKey[];
  startsAt?: Date;
  expiresAt?: Date | null;
  now?: Date;
};

export function createMerchantSubscriptionAggregate(
  input: CreateMerchantSubscriptionInput,
): MerchantSubscription {
  const at = input.now ?? new Date();
  const planCode = input.planCode ?? "pilot";
  const defaultFeatures = DEFAULT_PLAN_FEATURES[planCode];
  const features = input.features && input.features.length > 0 ? input.features : defaultFeatures;

  return {
    id: input.id,
    merchantId: input.merchantId,
    planCode,
    feeBps: input.feeBps ?? (planCode === "pilot" ? 0 : 0),
    features,
    startsAt: input.startsAt ?? at,
    expiresAt: input.expiresAt ?? null,
    createdAt: at,
    updatedAt: at,
  };
}

export type MerchantCreditLedgerEntry = {
  readonly id: string;
  readonly merchantId: string;
  /** IRR minor units (rial). Positive for topup/grant, negative for usage/deduction. */
  readonly amountMinor: bigint;
  /** topup | sms_campaign | system_grant | adjustment */
  readonly reason: string;
  readonly referenceId?: string;
  readonly createdAt: Date;
};

export type CreateCreditLedgerEntryInput = {
  id: string;
  merchantId: string;
  amountMinor: bigint;
  reason: string;
  referenceId?: string;
  now?: Date;
};

export function createCreditLedgerEntryAggregate(
  input: CreateCreditLedgerEntryInput,
): MerchantCreditLedgerEntry {
  const at = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    amountMinor: input.amountMinor,
    reason: input.reason,
    ...(input.referenceId !== undefined ? { referenceId: input.referenceId } : {}),
    createdAt: at,
  };
}

export type MerchantCreditBalance = {
  readonly merchantId: string;
  readonly balanceMinor: bigint;
  readonly balanceToman: bigint;
  readonly formattedToman: string;
  readonly entriesCount: number;
};
