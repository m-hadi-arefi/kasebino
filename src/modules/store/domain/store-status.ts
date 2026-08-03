/**
 * Store status value object helpers (ADR-006).
 */

export const STORE_STATUSES = ["draft", "active", "inactive"] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

export function isStoreStatus(value: string): value is StoreStatus {
  return (STORE_STATUSES as readonly string[]).includes(value);
}

export function isStoreActive(status: StoreStatus): boolean {
  return status === "active";
}
