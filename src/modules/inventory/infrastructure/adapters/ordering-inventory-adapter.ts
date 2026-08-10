/**
 * ADR-142 — Production adapters wiring inventory use cases to ordering ports.
 * Replaces no-op stubs so pickup orders actually decrement/restore stock.
 */

import type { InventoryUseCases } from "../../application/use-cases.js";
import type { InventoryReservePort, InventoryReleasePort } from "../../../ordering/application/ports.js";

/**
 * Adapter: ordering.InventoryReservePort → inventory.decrementForPickupPaid.
 * Called inside markPaid to decrement stock per line (idempotent via syncKey).
 */
export function createInventoryReserveAdapter(
  inventory: InventoryUseCases,
): InventoryReservePort {
  return {
    async reserveForOrder(input) {
      for (const line of input.lines) {
        await inventory.decrementForPickupPaid({
          merchantId: input.merchantId,
          storeId: input.storeId,
          productId: line.productId,
          quantity: line.quantity,
          orderStatus: "paid",
          syncKey: `pickup:${input.orderId}:${line.productId}`,
          orderId: input.orderId,
        });
      }
    },
  };
}

/**
 * Adapter: ordering.InventoryReleasePort → inventory.restorePickupStock.
 * Called on cancel/refund to compensate stock for paid orders.
 */
export function createInventoryReleaseAdapter(
  inventory: InventoryUseCases,
): InventoryReleasePort {
  return {
    async releaseForOrder(input) {
      for (const line of input.lines) {
        await inventory.restorePickupStock({
          merchantId: input.merchantId,
          storeId: input.storeId,
          productId: line.productId,
          quantity: line.quantity,
          syncKey: `pickup-restore:${input.orderId}:${line.productId}`,
          orderId: input.orderId,
        });
      }
    },
  };
}
