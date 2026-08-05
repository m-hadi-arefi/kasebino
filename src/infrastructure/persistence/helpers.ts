/**
 * Shared Drizzle repository helpers (ADR-093 / ADR-047 / ADR-048).
 * Soft-delete filters + tenant scope asserts — used only in infrastructure.
 */

import { isNull, type Column, type SQL } from "drizzle-orm";

/** Exclude soft-deleted rows (`deleted_at IS NULL`). */
export function notDeleted(column: Column): SQL {
  return isNull(column);
}

export function assertMerchantId(merchantId: string): void {
  if (!merchantId.trim()) {
    throw new Error("merchantId is required for tenant-scoped query (ADR-048)");
  }
}

export function assertStoreId(storeId: string): void {
  if (!storeId.trim()) {
    throw new Error("storeId is required for store-scoped query (ADR-048)");
  }
}

export function parseJsonObject<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
