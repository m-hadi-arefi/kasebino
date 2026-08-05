/**
 * Store sale receipt HTML into ObjectStoragePort (ADR-111).
 * Callers must never fail CompleteSale when this throws — catch at boundary.
 */

import {
  MINIO_BUCKETS,
  buildObjectKey,
  createReceiptRef,
  encodeFilenameMetadata,
  putValidatedObject,
  type ObjectStoragePort,
  type ReceiptRef,
} from "../../../minio-storage/index.js";
import type { Sale } from "../domain/sale.js";
import { renderSaleReceiptHtml } from "./receipt-html.js";

export type StoreSaleReceiptInput = {
  storage: ObjectStoragePort;
  sale: Sale;
  storeDisplayName?: string | null;
};

export type StoreSaleReceiptResult = {
  receiptRef: ReceiptRef;
  objectKey: string;
};

export async function storeSaleReceiptObject(
  input: StoreSaleReceiptInput,
): Promise<StoreSaleReceiptResult> {
  const rendered = renderSaleReceiptHtml({
    sale: input.sale,
    ...(input.storeDisplayName !== undefined
      ? { storeDisplayName: input.storeDisplayName }
      : {}),
  });
  const objectKey = buildObjectKey({
    merchantId: input.sale.merchantId,
    storeId: input.sale.storeId,
    kind: MINIO_BUCKETS.receipts,
    filename: `${input.sale.id}.html`,
  });
  await putValidatedObject(input.storage, {
    bucket: MINIO_BUCKETS.receipts,
    objectKey,
    body: rendered.body,
    contentType: rendered.contentType,
    metadata: encodeFilenameMetadata(rendered.filenameFa),
  });
  const receiptRef = createReceiptRef({
    objectKey,
    contentType: rendered.contentType,
    byteSize: rendered.body.byteLength,
  });
  return { receiptRef, objectKey };
}
