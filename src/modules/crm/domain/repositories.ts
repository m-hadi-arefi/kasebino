import type { StoreMembership } from "./store-membership.js";

/** Domain port — Drizzle adapter follows schema stub (ARD-031 migrations). */
export type StoreMembershipRepository = {
  save(membership: StoreMembership): Promise<void>;
  update(membership: StoreMembership): Promise<void>;
  findById(id: string): Promise<StoreMembership | null>;
  /**
   * Active membership for store + national phone.
   * Soft-deleted rows are excluded.
   */
  findByStoreAndPhone(
    storeId: string,
    phoneNational: string,
  ): Promise<StoreMembership | null>;
  /**
   * Default list for a store — soft-deleted excluded.
   * Always store-scoped; optional merchantId narrows tenant filter.
   */
  listByStoreId(
    storeId: string,
    options?: { merchantId?: string; includeDeleted?: boolean },
  ): Promise<StoreMembership[]>;
  /** Merchant-wide membership list for analytics counters (ADR-106). */
  listByMerchantId(
    merchantId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<StoreMembership[]>;
};
