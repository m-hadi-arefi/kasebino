/**
 * In-Memory Subscription and Credit Ledger Repositories (ADR-153).
 */

import type {
  MerchantCreditLedgerRepository,
  MerchantSubscriptionRepository,
} from "../../domain/repositories.js";
import type {
  MerchantCreditLedgerEntry,
  MerchantSubscription,
} from "../../domain/subscription.js";

export class InMemoryMerchantSubscriptionRepository
  implements MerchantSubscriptionRepository
{
  private subscriptions = new Map<string, MerchantSubscription>();

  async findByMerchantId(merchantId: string): Promise<MerchantSubscription | null> {
    return this.subscriptions.get(merchantId) ?? null;
  }

  async save(subscription: MerchantSubscription): Promise<void> {
    this.subscriptions.set(subscription.merchantId, { ...subscription });
  }

  async update(subscription: MerchantSubscription): Promise<void> {
    this.subscriptions.set(subscription.merchantId, { ...subscription });
  }
}

export class InMemoryMerchantCreditLedgerRepository
  implements MerchantCreditLedgerRepository
{
  private entries: MerchantCreditLedgerEntry[] = [];

  async recordEntry(entry: MerchantCreditLedgerEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async listEntriesByMerchant(
    merchantId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MerchantCreditLedgerEntry[]> {
    const list = this.entries
      .filter((e) => e.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list.slice(offset, offset + limit);
  }

  async getBalance(merchantId: string): Promise<bigint> {
    return this.entries
      .filter((e) => e.merchantId === merchantId)
      .reduce((sum, e) => sum + e.amountMinor, 0n);
  }
}
