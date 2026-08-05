/**
 * In-memory MerchantRepository for unit tests / local wiring until Drizzle.
 */

import type { Merchant } from "../../domain/merchant.js";
import type {
  ListMerchantsInput,
  MerchantRepository,
} from "../../domain/repositories.js";

export class InMemoryMerchantRepository implements MerchantRepository {
  private readonly byId = new Map<string, Merchant>();
  private readonly bySlug = new Map<string, string>();

  async save(merchant: Merchant): Promise<void> {
    this.byId.set(merchant.id, merchant);
    this.bySlug.set(merchant.slug, merchant.id);
  }

  async findById(id: string): Promise<Merchant | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Merchant | null> {
    const id = this.bySlug.get(slug);
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  async findByOwnerUserId(ownerUserId: string): Promise<Merchant | null> {
    const owner = ownerUserId.trim();
    for (const merchant of this.byId.values()) {
      if (merchant.ownerUserId === owner) {
        return merchant;
      }
    }
    return null;
  }

  async update(merchant: Merchant): Promise<void> {
    const previous = this.byId.get(merchant.id);
    if (previous && previous.slug !== merchant.slug) {
      this.bySlug.delete(previous.slug);
    }
    this.byId.set(merchant.id, merchant);
    this.bySlug.set(merchant.slug, merchant.id);
  }

  async list(input: ListMerchantsInput = {}): Promise<Merchant[]> {
    const limit = input.limit ?? 100;
    const offset = input.offset ?? 0;
    let rows = [...this.byId.values()];
    if (input.status !== undefined) {
      rows = rows.filter((m) => m.status === input.status);
    }
    rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return rows.slice(offset, offset + limit);
  }
}
