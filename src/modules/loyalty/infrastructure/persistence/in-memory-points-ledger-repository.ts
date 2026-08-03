/**
 * In-memory append-only PointsLedgerRepository (ADR-010).
 * No update/delete APIs — corrections are new ledger rows.
 */

import type { PointsLedgerEntry } from "../../domain/points-ledger.js";
import type { PointsLedgerRepository } from "../../domain/repositories.js";

export class InMemoryPointsLedgerRepository implements PointsLedgerRepository {
  private readonly byId = new Map<string, PointsLedgerEntry>();
  private readonly earnBySaleId = new Map<string, string>();

  async append(entry: PointsLedgerEntry): Promise<void> {
    if (this.byId.has(entry.id)) {
      throw new Error(`Ledger entry ${entry.id} already exists (append-only)`);
    }
    if (
      entry.entryType === "earn" &&
      entry.referenceKind === "sale" &&
      entry.referenceId
    ) {
      if (this.earnBySaleId.has(entry.referenceId)) {
        throw new Error(
          `Earn ledger already exists for sale ${entry.referenceId}`,
        );
      }
      this.earnBySaleId.set(entry.referenceId, entry.id);
    }
    this.byId.set(entry.id, entry);
  }

  async findById(id: string): Promise<PointsLedgerEntry | null> {
    return this.byId.get(id) ?? null;
  }

  async findEarnBySaleId(saleId: string): Promise<PointsLedgerEntry | null> {
    const id = this.earnBySaleId.get(saleId);
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  async listByWalletId(
    walletId: string,
    options?: { limit?: number },
  ): Promise<PointsLedgerEntry[]> {
    const limit = options?.limit ?? 100;
    return [...this.byId.values()]
      .filter((e) => e.walletId === walletId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }
}
