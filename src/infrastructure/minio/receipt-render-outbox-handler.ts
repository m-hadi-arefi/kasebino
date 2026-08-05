/**
 * Outbox consumer: render receipt when CompleteSale path missed MinIO (ADR-111).
 */

import {
  MINIO_BUCKETS,
  type ObjectStoragePort,
} from "../../minio-storage/index.js";
import type { SaleRepository } from "../../modules/pos/domain/repositories.js";
import { attachSaleReceiptRef } from "../../modules/pos/domain/sale.js";
import { storeSaleReceiptObject } from "../../modules/pos/application/store-sale-receipt.js";
import type { StoreRepository } from "../../modules/store/domain/repositories.js";
import type { OutboxMessage } from "../../outbox/index.js";

export function createReceiptRenderOutboxHandler(deps: {
  sales: SaleRepository;
  stores: StoreRepository;
  objectStorage: ObjectStoragePort;
}) {
  return async function handleReceiptRender(
    message: OutboxMessage,
  ): Promise<void> {
    if (message.eventType !== "SaleCompleted") return;
    const saleId =
      (typeof message.envelope.payload.saleId === "string"
        ? message.envelope.payload.saleId
        : null) ??
      message.aggregateId ??
      null;
    if (!saleId) return;

    const sale = await deps.sales.findById(saleId);
    if (!sale) return;
    if (sale.receiptObjectKey) return;

    const store = await deps.stores.findById(sale.storeId);
    const stored = await storeSaleReceiptObject({
      storage: deps.objectStorage,
      sale,
      ...(store?.branding.displayName
        ? { storeDisplayName: store.branding.displayName }
        : {}),
    });
    attachSaleReceiptRef(sale, {
      objectKey: stored.objectKey,
      contentType: stored.receiptRef.contentType,
    });
    await deps.sales.updateReceiptRef(sale.id, {
      objectKey: stored.objectKey,
      contentType: stored.receiptRef.contentType,
    });
    // Touch bucket constant so tree-shaking keeps receipts alignment.
    void MINIO_BUCKETS.receipts;
  };
}
