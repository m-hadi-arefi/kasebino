/**
 * In-memory WalletRepository for unit tests / local wiring until Drizzle.
 */

import type { WalletRepository } from "../../domain/repositories.js";
import type { Wallet } from "../../domain/wallet.js";

export class InMemoryWalletRepository implements WalletRepository {
  private readonly byId = new Map<string, Wallet>();

  async save(wallet: Wallet): Promise<void> {
    this.byId.set(wallet.id, wallet);
  }

  async update(wallet: Wallet): Promise<void> {
    this.byId.set(wallet.id, wallet);
  }

  async findById(id: string): Promise<Wallet | null> {
    return this.byId.get(id) ?? null;
  }

  async findByStoreMembershipId(
    storeMembershipId: string,
  ): Promise<Wallet | null> {
    for (const wallet of this.byId.values()) {
      if (wallet.storeMembershipId === storeMembershipId) {
        return wallet;
      }
    }
    return null;
  }

  async listWithPositiveBalance(options?: {
    merchantId?: string;
    storeId?: string;
    limit?: number;
  }): Promise<Wallet[]> {
    const limit = options?.limit ?? 100;
    const out: Wallet[] = [];
    for (const wallet of this.byId.values()) {
      if (wallet.balance <= 0) continue;
      if (wallet.lastEarnAt === null) continue;
      if (
        options?.merchantId !== undefined &&
        wallet.merchantId !== options.merchantId
      ) {
        continue;
      }
      if (
        options?.storeId !== undefined &&
        wallet.storeId !== options.storeId
      ) {
        continue;
      }
      out.push(wallet);
      if (out.length >= limit) break;
    }
    return out;
  }
}
