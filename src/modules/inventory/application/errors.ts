/**
 * Persian inventory-domain errors (ADR-008 / ADR-049 Iranian First).
 * Shop-floor language for stock adjustments and sync conflicts.
 */

import { INVENTORY_SYNC_MESSAGES_FA } from "../../../inventory-sync/index.js";

export const INVENTORY_ERROR_CODES = [
  "INVALID_QUANTITY_DELTA",
  "INSUFFICIENT_STOCK",
  "STOCK_ITEM_NOT_FOUND",
  "INVALID_STORE_SCOPE",
  "VERSION_CONFLICT",
  "IDEMPOTENT_ALREADY_APPLIED",
  "SALE_TX_REQUIRED",
  "OFFLINE_STOCK_REJECTED",
] as const;

export type InventoryErrorCode = (typeof INVENTORY_ERROR_CODES)[number];

export const INVENTORY_ERROR_MESSAGES_FA = {
  INVALID_QUANTITY_DELTA: "مقدار تغییر موجودی معتبر نیست.",
  INSUFFICIENT_STOCK: INVENTORY_SYNC_MESSAGES_FA.INSUFFICIENT_STOCK,
  STOCK_ITEM_NOT_FOUND: INVENTORY_SYNC_MESSAGES_FA.STOCK_ITEM_NOT_FOUND,
  INVALID_STORE_SCOPE: INVENTORY_SYNC_MESSAGES_FA.INVALID_STORE_SCOPE,
  VERSION_CONFLICT: INVENTORY_SYNC_MESSAGES_FA.VERSION_CONFLICT,
  IDEMPOTENT_ALREADY_APPLIED:
    INVENTORY_SYNC_MESSAGES_FA.IDEMPOTENT_ALREADY_APPLIED,
  SALE_TX_REQUIRED:
    "کاهش موجودی فروش باید داخل همان تراکنش تکمیل فروش انجام شود.",
  OFFLINE_STOCK_REJECTED: INVENTORY_SYNC_MESSAGES_FA.OFFLINE_STOCK_REJECTED,
} as const satisfies Record<InventoryErrorCode, string>;

export class InventoryDomainError extends Error {
  readonly code: InventoryErrorCode;
  readonly messageFa: string;

  constructor(code: InventoryErrorCode) {
    const messageFa = INVENTORY_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "InventoryDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isInventoryDomainError(
  error: unknown,
): error is InventoryDomainError {
  return error instanceof InventoryDomainError;
}
