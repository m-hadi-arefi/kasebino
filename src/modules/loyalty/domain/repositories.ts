import type { PointRule } from "./point-rule.js";
import type { PointsLedgerEntry } from "./points-ledger.js";
import type { Wallet } from "./wallet.js";

/** Domain ports — Drizzle adapters follow schema stubs (ARD-009 migrations). */

export type PointRuleRepository = {
  save(rule: PointRule): Promise<void>;
  update(rule: PointRule): Promise<void>;
  findById(id: string): Promise<PointRule | null>;
  findByStoreId(
    merchantId: string,
    storeId: string,
  ): Promise<PointRule | null>;
};

export type WalletRepository = {
  save(wallet: Wallet): Promise<void>;
  update(wallet: Wallet): Promise<void>;
  findById(id: string): Promise<Wallet | null>;
  findByStoreMembershipId(
    storeMembershipId: string,
  ): Promise<Wallet | null>;
  /**
   * Candidate wallets for expire job (balance > 0, lastEarnAt set).
   * Caller applies PointsExpiryPolicy.
   */
  listWithPositiveBalance(options?: {
    merchantId?: string;
    storeId?: string;
    limit?: number;
  }): Promise<Wallet[]>;
};

/**
 * Append-only ledger — insert and query only. No update/delete.
 */
export type PointsLedgerRepository = {
  append(entry: PointsLedgerEntry): Promise<void>;
  findById(id: string): Promise<PointsLedgerEntry | null>;
  /**
   * Idempotency for earn-on-sale: unique earn per sale reference.
   */
  findEarnBySaleId(saleId: string): Promise<PointsLedgerEntry | null>;
  /**
   * Idempotency for earn-on-order: unique earn per order reference (ADR-145).
   */
  findEarnByOrderId(orderId: string): Promise<PointsLedgerEntry | null>;
  /**
   * Idempotency for POS redeem when referenceId is supplied.
   */
  findRedeemByReferenceId(
    referenceId: string,
  ): Promise<PointsLedgerEntry | null>;
  listByWalletId(
    walletId: string,
    options?: { limit?: number },
  ): Promise<PointsLedgerEntry[]>;
};
