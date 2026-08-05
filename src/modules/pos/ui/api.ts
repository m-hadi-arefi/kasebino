/**
 * ADR-096 POS HTTP client helpers (staff session cookies).
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import { POS_CONSENT_NOTICE_VERSION } from "./copy.js";

export type PosProductDto = {
  id: string;
  merchantId: string;
  name: string;
  barcode: string;
  priceAmountMinor: string;
  priceDisplayToman: string;
};

export type PosStoreDto = {
  id: string;
  merchantId: string;
  displayName: string;
  slug: string;
};

export type PosSaleDto = {
  id: string;
  receiptRef: string;
  receiptReady?: boolean;
  receiptUrl?: string | null;
  phoneNational: string;
  tenderType: string;
  totalAmountMinor: string;
  totalDisplayToman?: string;
  completedAt: string | null;
  createdAt: string;
};

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string };
};

async function parseJson<T>(res: Response): Promise<Envelope<T>> {
  return (await res.json()) as Envelope<T>;
}

export async function fetchMerchantStores(): Promise<PosStoreDto[]> {
  const res = await fetch("/api/v1/stores", { credentials: "same-origin" });
  const body = await parseJson<{ stores: PosStoreDto[] }>(res);
  if (!res.ok) {
    throw new Error(body.error?.message ?? "stores_failed");
  }
  return body.data?.stores ?? [];
}

export async function lookupProductByBarcode(
  barcode: string,
): Promise<PosProductDto | null> {
  const url = `/api/v1/catalog/products/by-barcode?barcode=${encodeURIComponent(barcode)}`;
  const res = await fetch(url, { credentials: "same-origin" });
  const body = await parseJson<{ product: PosProductDto | null }>(res);
  if (!res.ok) {
    throw new Error(body.error?.message ?? "lookup_failed");
  }
  return body.data?.product ?? null;
}

export async function searchProducts(query: string): Promise<PosProductDto[]> {
  const url = `/api/v1/catalog/products/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { credentials: "same-origin" });
  const body = await parseJson<{ products: PosProductDto[] }>(res);
  if (!res.ok) {
    throw new Error(body.error?.message ?? "search_failed");
  }
  return body.data?.products ?? [];
}

export type CompleteSaleClientInput = {
  storeId: string;
  phone: string;
  tenderType: "cash" | "card_terminal" | "mixed";
  lines: {
    productId: string;
    productName: string;
    quantity: number;
    unitPriceMinor: number;
  }[];
  idempotencyKey: string;
};

export async function completePosSale(
  input: CompleteSaleClientInput,
): Promise<{ sale: PosSaleDto; membershipCreated: boolean }> {
  const res = await fetch("/api/v1/pos/sales", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify({
      storeId: input.storeId,
      phone: input.phone,
      tenderType: input.tenderType,
      consentNoticeVersion: POS_CONSENT_NOTICE_VERSION,
      lines: input.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
      })),
    }),
  });
  const body = await parseJson<{
    sale: PosSaleDto;
    membershipCreated: boolean;
  }>(res);
  if (!res.ok) {
    throw new Error(body.error?.message ?? "sale_failed");
  }
  if (!body.data?.sale) {
    throw new Error("sale_failed");
  }
  return {
    sale: body.data.sale,
    membershipCreated: Boolean(body.data.membershipCreated),
  };
}

/** Fetch short-TTL signed receipt download URL (ADR-111). */
export async function fetchSaleReceiptDownload(
  saleId: string,
): Promise<{ downloadUrl: string; expiresAt: string }> {
  const res = await fetch(
    `/api/v1/sales/${encodeURIComponent(saleId)}/receipt`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{
    downloadUrl: string;
    expiresAt: string;
  }>(res);
  if (!res.ok) {
    throw new Error(body.error?.message ?? "receipt_failed");
  }
  if (!body.data?.downloadUrl) {
    throw new Error("receipt_missing");
  }
  return {
    downloadUrl: body.data.downloadUrl,
    expiresAt: body.data.expiresAt,
  };
}
