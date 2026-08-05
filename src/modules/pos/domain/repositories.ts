import type { Sale } from "./sale.js";

export type SaleRepository = {
  save(sale: Sale): Promise<void>;
  findById(id: string): Promise<Sale | null>;
  findByIdempotencyKey(
    merchantId: string,
    idempotencyKey: string,
  ): Promise<Sale | null>;
  /**
   * Persist MinIO receipt key after async/sync render (ADR-111).
   */
  updateReceiptRef(
    saleId: string,
    input: { objectKey: string; contentType: string },
  ): Promise<void>;
  /**
   * Completed, non-deleted sales for a membership (ADR-098 CRM history).
   * Ordered by completedAt descending.
   */
  listCompletedByMembershipId(membershipId: string): Promise<Sale[]>;
  /**
   * Completed, non-deleted sales for a store (ADR-098 segment computation).
   * Ordered by completedAt ascending (stable for aggregation).
   */
  listCompletedByStoreId(storeId: string): Promise<Sale[]>;
  /**
   * Completed sales for merchant analytics counters (ADR-106).
   * Ordered by completedAt ascending.
   */
  listCompletedByMerchantId(
    merchantId: string,
    opts?: { storeId?: string | null },
  ): Promise<Sale[]>;
};
