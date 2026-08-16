/**
 * Merchant Subscription and Credit Ledger Application Use Cases (ADR-153).
 */

import { randomUUID } from "node:crypto";
import { formatTomanDisplay, moneyFromMinor, toToman } from "../../../shared/domain/money.js";
import type {
  MerchantCreditLedgerRepository,
  MerchantRepository,
  MerchantSubscriptionRepository,
} from "../domain/repositories.js";
import {
  DEFAULT_PLAN_FEATURES,
  PLAN_NAMES_FA,
  createCreditLedgerEntryAggregate,
  createMerchantSubscriptionAggregate,
  type FeatureFlagKey,
  type MerchantCreditBalance,
  type MerchantSubscription,
  type PlanCode,
} from "../domain/subscription.js";
import { MerchantDomainError } from "./errors.js";
import { getMerchantFeatureFlags } from "./feature-flags.js";

export type SubscriptionUseCaseDeps = {
  merchants: MerchantRepository;
  subscriptions: MerchantSubscriptionRepository;
  credits: MerchantCreditLedgerRepository;
  idFactory?: () => string;
  now?: () => Date;
};

export type MerchantSubscriptionSummary = {
  subscription: MerchantSubscription;
  planNameFa: string;
  featureFlags: Record<FeatureFlagKey, boolean>;
  feeBps: number;
};

export function createSubscriptionUseCases(deps: SubscriptionUseCaseDeps) {
  const idFactory = deps.idFactory ?? randomUUID;
  const now = deps.now ?? (() => new Date());

  async function getOrCreateSubscription(
    merchantId: string,
  ): Promise<MerchantSubscription> {
    const existing = await deps.subscriptions.findByMerchantId(merchantId);
    if (existing) return existing;

    // Verify merchant exists
    const merchant = await deps.merchants.findById(merchantId);
    if (!merchant) {
      throw new MerchantDomainError("MERCHANT_NOT_FOUND");
    }

    // Default Phase 1 Pilot Subscription
    const created = createMerchantSubscriptionAggregate({
      id: idFactory(),
      merchantId,
      planCode: "pilot",
      feeBps: 0,
      features: DEFAULT_PLAN_FEATURES.pilot,
      now: now(),
    });

    await deps.subscriptions.save(created);
    return created;
  }

  async function getMerchantSubscription(
    merchantId: string,
  ): Promise<MerchantSubscriptionSummary> {
    const subscription = await getOrCreateSubscription(merchantId);
    return {
      subscription,
      planNameFa: PLAN_NAMES_FA[subscription.planCode],
      featureFlags: getMerchantFeatureFlags(subscription),
      feeBps: subscription.feeBps,
    };
  }

  async function assignMerchantPlan(input: {
    merchantId: string;
    planCode: PlanCode;
    feeBps?: number;
    features?: readonly FeatureFlagKey[];
    expiresAt?: Date | null;
  }): Promise<MerchantSubscriptionSummary> {
    const existing = await deps.subscriptions.findByMerchantId(input.merchantId);
    const at = now();

    let subscription: MerchantSubscription;
    if (existing) {
      existing.planCode = input.planCode;
      existing.feeBps = input.feeBps ?? (input.planCode === "pilot" ? 0 : existing.feeBps);
      existing.features = input.features ?? DEFAULT_PLAN_FEATURES[input.planCode];
      if (input.expiresAt !== undefined) {
        existing.expiresAt = input.expiresAt;
      }
      existing.updatedAt = at;
      await deps.subscriptions.update(existing);
      subscription = existing;
    } else {
      const merchant = await deps.merchants.findById(input.merchantId);
      if (!merchant) {
        throw new MerchantDomainError("MERCHANT_NOT_FOUND");
      }
      subscription = createMerchantSubscriptionAggregate({
        id: idFactory(),
        merchantId: input.merchantId,
        planCode: input.planCode,
        feeBps: input.feeBps ?? (input.planCode === "pilot" ? 0 : 0),
        features: input.features ?? DEFAULT_PLAN_FEATURES[input.planCode],
        expiresAt: input.expiresAt ?? null,
        now: at,
      });
      await deps.subscriptions.save(subscription);
    }

    return {
      subscription,
      planNameFa: PLAN_NAMES_FA[subscription.planCode],
      featureFlags: getMerchantFeatureFlags(subscription),
      feeBps: subscription.feeBps,
    };
  }

  async function topupMerchantCredits(input: {
    merchantId: string;
    amountMinor: bigint;
    reason?: string;
    referenceId?: string;
  }): Promise<MerchantCreditBalance> {
    if (input.amountMinor <= 0n) {
      throw new Error("Topup amount must be positive");
    }

    const merchant = await deps.merchants.findById(input.merchantId);
    if (!merchant) {
      throw new MerchantDomainError("MERCHANT_NOT_FOUND");
    }

    const entry = createCreditLedgerEntryAggregate({
      id: idFactory(),
      merchantId: input.merchantId,
      amountMinor: input.amountMinor,
      reason: input.reason ?? "topup",
      ...(input.referenceId !== undefined ? { referenceId: input.referenceId } : {}),
      now: now(),
    });

    await deps.credits.recordEntry(entry);
    return getCreditBalance(input.merchantId);
  }

  async function deductMerchantCredits(input: {
    merchantId: string;
    amountMinor: bigint;
    reason: string;
    referenceId?: string;
  }): Promise<MerchantCreditBalance> {
    if (input.amountMinor <= 0n) {
      throw new Error("Deduction amount must be positive");
    }

    const currentBalance = await deps.credits.getBalance(input.merchantId);
    if (currentBalance < input.amountMinor) {
      throw new MerchantDomainError("INSUFFICIENT_CREDITS");
    }

    const entry = createCreditLedgerEntryAggregate({
      id: idFactory(),
      merchantId: input.merchantId,
      amountMinor: -input.amountMinor,
      reason: input.reason,
      ...(input.referenceId !== undefined ? { referenceId: input.referenceId } : {}),
      now: now(),
    });

    await deps.credits.recordEntry(entry);
    return getCreditBalance(input.merchantId);
  }

  async function getCreditBalance(
    merchantId: string,
  ): Promise<MerchantCreditBalance> {
    const balanceMinor = await deps.credits.getBalance(merchantId);
    const entries = await deps.credits.listEntriesByMerchant(merchantId, 1);
    const nonNegativeMinor = balanceMinor >= 0n ? balanceMinor : 0n;
    const money = moneyFromMinor(nonNegativeMinor);
    const balanceToman = toToman(money);
    const formattedToman = formatTomanDisplay(money);

    return {
      merchantId,
      balanceMinor,
      balanceToman,
      formattedToman,
      entriesCount: entries.length,
    };
  }

  return {
    getMerchantSubscription,
    assignMerchantPlan,
    topupMerchantCredits,
    deductMerchantCredits,
    getCreditBalance,
  };
}

export type SubscriptionUseCases = ReturnType<typeof createSubscriptionUseCases>;
