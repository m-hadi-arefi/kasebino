import type { Store } from "./store.js";

/** Domain port — Drizzle adapter follows schema stub (ARD-004 migrations). */
export type StoreRepository = {
  save(store: Store): Promise<void>;
  findById(id: string): Promise<Store | null>;
  findBySlug(slug: string): Promise<Store | null>;
  listByMerchantId(merchantId: string): Promise<Store[]>;
  update(store: Store): Promise<void>;
};
