/**
 * Drizzle loyalty repositories (ADR-093 / ADR-010).
 */

import { and, asc, eq, gt, isNotNull } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import type { DrizzleTransactionScope } from "../../../../infrastructure/persistence/drizzle-transaction-scope.js";
import {
  pointRules,
  pointsLedger,
  wallets,
} from "../../../../infrastructure/database/schema/loyalty.js";
import {
  assertMerchantId,
  assertStoreId,
} from "../../../../infrastructure/persistence/helpers.js";
import type { LedgerEntryType } from "../../../../loyalty-domain/index.js";
import type { PointRule } from "../../domain/point-rule.js";
import type { PointsLedgerEntry } from "../../domain/points-ledger.js";
import type {
  PointRuleRepository,
  PointsLedgerRepository,
  WalletRepository,
} from "../../domain/repositories.js";
import type { Wallet } from "../../domain/wallet.js";

type RuleRow = typeof pointRules.$inferSelect;
type WalletRow = typeof wallets.$inferSelect;
type LedgerRow = typeof pointsLedger.$inferSelect;

function toRule(row: RuleRow): PointRule {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    amountMinorPerPoint: row.amountMinorPerPoint,
    pointsPerUnit: row.pointsPerUnit,
    expiryMonthsAfterLastEarn: row.expiryMonthsAfterLastEarn,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toWallet(row: WalletRow): Wallet {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    storeMembershipId: row.storeMembershipId,
    customerId: row.customerId,
    balance: row.balance,
    version: row.version,
    lastEarnAt: row.lastEarnAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toLedger(row: LedgerRow): PointsLedgerEntry {
  return {
    id: row.id,
    walletId: row.walletId,
    merchantId: row.merchantId,
    storeId: row.storeId,
    storeMembershipId: row.storeMembershipId,
    entryType: row.entryType as LedgerEntryType,
    points: row.points,
    referenceId: row.referenceId,
    referenceKind: row.referenceKind as PointsLedgerEntry["referenceKind"],
    createdAt: row.createdAt,
  };
}

export class DrizzlePointRuleRepository implements PointRuleRepository {
  constructor(private readonly dbOrScope: DrizzleDb | DrizzleTransactionScope) {}

  private get db(): DrizzleDb {
    return "executor" in this.dbOrScope ? this.dbOrScope.executor : this.dbOrScope;
  }

  async save(rule: PointRule): Promise<void> {
    await this.db.insert(pointRules).values({
      id: rule.id,
      merchantId: rule.merchantId,
      storeId: rule.storeId,
      amountMinorPerPoint: rule.amountMinorPerPoint,
      pointsPerUnit: rule.pointsPerUnit,
      expiryMonthsAfterLastEarn: rule.expiryMonthsAfterLastEarn,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    });
  }

  async update(rule: PointRule): Promise<void> {
    await this.db
      .update(pointRules)
      .set({
        amountMinorPerPoint: rule.amountMinorPerPoint,
        pointsPerUnit: rule.pointsPerUnit,
        expiryMonthsAfterLastEarn: rule.expiryMonthsAfterLastEarn,
        updatedAt: rule.updatedAt,
      })
      .where(
        and(
          eq(pointRules.id, rule.id),
          eq(pointRules.merchantId, rule.merchantId),
          eq(pointRules.storeId, rule.storeId),
        ),
      );
  }

  async findById(id: string): Promise<PointRule | null> {
    const rows = await this.db
      .select()
      .from(pointRules)
      .where(eq(pointRules.id, id))
      .limit(1);
    return rows[0] ? toRule(rows[0]) : null;
  }

  async findByStoreId(
    merchantId: string,
    storeId: string,
  ): Promise<PointRule | null> {
    assertMerchantId(merchantId);
    assertStoreId(storeId);
    const rows = await this.db
      .select()
      .from(pointRules)
      .where(
        and(
          eq(pointRules.merchantId, merchantId),
          eq(pointRules.storeId, storeId),
        ),
      )
      .limit(1);
    return rows[0] ? toRule(rows[0]) : null;
  }
}

export class DrizzleWalletRepository implements WalletRepository {
  constructor(private readonly dbOrScope: DrizzleDb | DrizzleTransactionScope) {}

  private get db(): DrizzleDb {
    return "executor" in this.dbOrScope ? this.dbOrScope.executor : this.dbOrScope;
  }

  async save(wallet: Wallet): Promise<void> {
    await this.db.insert(wallets).values({
      id: wallet.id,
      merchantId: wallet.merchantId,
      storeId: wallet.storeId,
      storeMembershipId: wallet.storeMembershipId,
      customerId: wallet.customerId,
      balance: wallet.balance,
      version: wallet.version,
      lastEarnAt: wallet.lastEarnAt,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    });
  }

  async update(wallet: Wallet): Promise<void> {
    await this.db
      .update(wallets)
      .set({
        balance: wallet.balance,
        version: wallet.version,
        lastEarnAt: wallet.lastEarnAt,
        updatedAt: wallet.updatedAt,
      })
      .where(
        and(
          eq(wallets.id, wallet.id),
          eq(wallets.merchantId, wallet.merchantId),
        ),
      );
  }

  async findById(id: string): Promise<Wallet | null> {
    const rows = await this.db
      .select()
      .from(wallets)
      .where(eq(wallets.id, id))
      .limit(1);
    return rows[0] ? toWallet(rows[0]) : null;
  }

  async findByStoreMembershipId(
    storeMembershipId: string,
  ): Promise<Wallet | null> {
    const rows = await this.db
      .select()
      .from(wallets)
      .where(eq(wallets.storeMembershipId, storeMembershipId))
      .limit(1);
    return rows[0] ? toWallet(rows[0]) : null;
  }

  async listWithPositiveBalance(options?: {
    merchantId?: string;
    storeId?: string;
    limit?: number;
  }): Promise<Wallet[]> {
    const limit = options?.limit ?? 100;
    const conditions = [gt(wallets.balance, 0), isNotNull(wallets.lastEarnAt)];
    if (options?.merchantId !== undefined) {
      assertMerchantId(options.merchantId);
      conditions.push(eq(wallets.merchantId, options.merchantId));
    }
    if (options?.storeId !== undefined) {
      assertStoreId(options.storeId);
      conditions.push(eq(wallets.storeId, options.storeId));
    }
    const rows = await this.db
      .select()
      .from(wallets)
      .where(and(...conditions))
      .limit(limit);
    return rows.map(toWallet);
  }
}

export class DrizzlePointsLedgerRepository implements PointsLedgerRepository {
  constructor(private readonly dbOrScope: DrizzleDb | DrizzleTransactionScope) {}

  private get db(): DrizzleDb {
    return "executor" in this.dbOrScope ? this.dbOrScope.executor : this.dbOrScope;
  }

  async append(entry: PointsLedgerEntry): Promise<void> {
    await this.db.insert(pointsLedger).values({
      id: entry.id,
      walletId: entry.walletId,
      merchantId: entry.merchantId,
      storeId: entry.storeId,
      storeMembershipId: entry.storeMembershipId,
      entryType: entry.entryType,
      points: entry.points,
      referenceId: entry.referenceId,
      referenceKind: entry.referenceKind,
      createdAt: entry.createdAt,
    });
  }

  async findById(id: string): Promise<PointsLedgerEntry | null> {
    const rows = await this.db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.id, id))
      .limit(1);
    return rows[0] ? toLedger(rows[0]) : null;
  }

  async findEarnBySaleId(saleId: string): Promise<PointsLedgerEntry | null> {
    const rows = await this.db
      .select()
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.entryType, "earn"),
          eq(pointsLedger.referenceKind, "sale"),
          eq(pointsLedger.referenceId, saleId),
        ),
      )
      .limit(1);
    return rows[0] ? toLedger(rows[0]) : null;
  }

  async findEarnByOrderId(orderId: string): Promise<PointsLedgerEntry | null> {
    const rows = await this.db
      .select()
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.entryType, "earn"),
          eq(pointsLedger.referenceKind, "order"),
          eq(pointsLedger.referenceId, orderId),
        ),
      )
      .limit(1);
    return rows[0] ? toLedger(rows[0]) : null;
  }

  async findRedeemByReferenceId(
    referenceId: string,
  ): Promise<PointsLedgerEntry | null> {
    const rows = await this.db
      .select()
      .from(pointsLedger)
      .where(
        and(
          eq(pointsLedger.entryType, "redeem"),
          eq(pointsLedger.referenceKind, "pos_redeem"),
          eq(pointsLedger.referenceId, referenceId),
        ),
      )
      .limit(1);
    return rows[0] ? toLedger(rows[0]) : null;
  }

  async listByWalletId(
    walletId: string,
    options?: { limit?: number },
  ): Promise<PointsLedgerEntry[]> {
    const limit = options?.limit ?? 100;
    const rows = await this.db
      .select()
      .from(pointsLedger)
      .where(eq(pointsLedger.walletId, walletId))
      .orderBy(asc(pointsLedger.createdAt))
      .limit(limit);
    return rows.map(toLedger);
  }
}
