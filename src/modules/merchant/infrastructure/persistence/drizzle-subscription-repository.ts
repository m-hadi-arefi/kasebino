/**
 * Drizzle Subscription and Credit Ledger Repositories (ADR-153).
 */

import { desc, eq } from "drizzle-orm";
import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import type { DrizzleTransactionScope } from "../../../../infrastructure/persistence/drizzle-transaction-scope.js";
import {
  merchantCreditLedger,
  merchantSubscriptions,
} from "../../../../infrastructure/database/schema/merchants.js";
import { assertMerchantId } from "../../../../infrastructure/persistence/helpers.js";
import type {
  MerchantCreditLedgerRepository,
  MerchantSubscriptionRepository,
} from "../../domain/repositories.js";
import type {
  FeatureFlagKey,
  MerchantCreditLedgerEntry,
  MerchantSubscription,
  PlanCode,
} from "../../domain/subscription.js";

type SubscriptionRow = typeof merchantSubscriptions.$inferSelect;
type CreditLedgerRow = typeof merchantCreditLedger.$inferSelect;

function toSubscription(row: SubscriptionRow): MerchantSubscription {
  let features: FeatureFlagKey[] = [];
  if (row.featuresJson) {
    try {
      features = JSON.parse(row.featuresJson) as FeatureFlagKey[];
    } catch {
      features = [];
    }
  }

  return {
    id: row.id,
    merchantId: row.merchantId,
    planCode: row.planCode as PlanCode,
    feeBps: row.feeBps,
    features,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCreditEntry(row: CreditLedgerRow): MerchantCreditLedgerEntry {
  return {
    id: row.id,
    merchantId: row.merchantId,
    amountMinor: row.amountMinor,
    reason: row.reason,
    ...(row.referenceId ? { referenceId: row.referenceId } : {}),
    createdAt: row.createdAt,
  };
}

export class DrizzleMerchantSubscriptionRepository
  implements MerchantSubscriptionRepository
{
  constructor(
    private readonly db: DrizzleDb,
    private readonly txScope?: DrizzleTransactionScope,
  ) {}

  private get runner(): DrizzleDb {
    return this.txScope?.executor ?? this.db;
  }

  async findByMerchantId(merchantId: string): Promise<MerchantSubscription | null> {
    assertMerchantId(merchantId);
    const rows = await this.runner
      .select()
      .from(merchantSubscriptions)
      .where(eq(merchantSubscriptions.merchantId, merchantId))
      .limit(1);

    const row = rows[0];
    return row ? toSubscription(row) : null;
  }

  async save(subscription: MerchantSubscription): Promise<void> {
    assertMerchantId(subscription.merchantId);
    await this.runner.insert(merchantSubscriptions).values({
      id: subscription.id,
      merchantId: subscription.merchantId,
      planCode: subscription.planCode,
      feeBps: subscription.feeBps,
      featuresJson: JSON.stringify(subscription.features),
      startsAt: subscription.startsAt,
      expiresAt: subscription.expiresAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    });
  }

  async update(subscription: MerchantSubscription): Promise<void> {
    assertMerchantId(subscription.merchantId);
    await this.runner
      .update(merchantSubscriptions)
      .set({
        planCode: subscription.planCode,
        feeBps: subscription.feeBps,
        featuresJson: JSON.stringify(subscription.features),
        startsAt: subscription.startsAt,
        expiresAt: subscription.expiresAt,
        updatedAt: subscription.updatedAt,
      })
      .where(eq(merchantSubscriptions.merchantId, subscription.merchantId));
  }
}

export class DrizzleMerchantCreditLedgerRepository
  implements MerchantCreditLedgerRepository
{
  constructor(
    private readonly db: DrizzleDb,
    private readonly txScope?: DrizzleTransactionScope,
  ) {}

  private get runner(): DrizzleDb {
    return this.txScope?.executor ?? this.db;
  }

  async recordEntry(entry: MerchantCreditLedgerEntry): Promise<void> {
    assertMerchantId(entry.merchantId);
    await this.runner.insert(merchantCreditLedger).values({
      id: entry.id,
      merchantId: entry.merchantId,
      amountMinor: entry.amountMinor,
      reason: entry.reason,
      referenceId: entry.referenceId ?? null,
      createdAt: entry.createdAt,
    });
  }

  async listEntriesByMerchant(
    merchantId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MerchantCreditLedgerEntry[]> {
    assertMerchantId(merchantId);
    const rows = await this.runner
      .select()
      .from(merchantCreditLedger)
      .where(eq(merchantCreditLedger.merchantId, merchantId))
      .orderBy(desc(merchantCreditLedger.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map(toCreditEntry);
  }

  async getBalance(merchantId: string): Promise<bigint> {
    assertMerchantId(merchantId);
    const rows = await this.runner
      .select()
      .from(merchantCreditLedger)
      .where(eq(merchantCreditLedger.merchantId, merchantId));

    return rows.reduce((sum, row) => sum + row.amountMinor, 0n);
  }
}
