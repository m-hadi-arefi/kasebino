/**
 * In-memory StoreRepository for unit tests / local wiring until Drizzle.
 */

import type { Store } from "../../domain/store.js";
import type { StoreRepository } from "../../domain/repositories.js";

export class InMemoryStoreRepository implements StoreRepository {
  private readonly byId = new Map<string, Store>();
  private readonly bySlug = new Map<string, string>();

  async save(store: Store): Promise<void> {
    this.byId.set(store.id, store);
    this.bySlug.set(store.slug, store.id);
  }

  async findById(id: string): Promise<Store | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Store | null> {
    const id = this.bySlug.get(slug);
    if (!id) return null;
    return this.byId.get(id) ?? null;
  }

  async listByMerchantId(merchantId: string): Promise<Store[]> {
    return [...this.byId.values()].filter((s) => s.merchantId === merchantId);
  }

  async update(store: Store): Promise<void> {
    const previous = this.byId.get(store.id);
    if (previous && previous.slug !== store.slug) {
      this.bySlug.delete(previous.slug);
    }
    this.byId.set(store.id, store);
    this.bySlug.set(store.slug, store.id);
  }
}
