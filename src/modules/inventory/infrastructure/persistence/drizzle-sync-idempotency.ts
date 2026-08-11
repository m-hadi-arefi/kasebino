/**
 * ADR-142 — Drizzle-backed idempotency for pickup stock sync.
 * Queries existing stock_movements rows by note column to check if
 * a syncKey (e.g. `pickup:{orderId}:{productId}`) was already applied.
 * The stock movement insert itself records the syncKey as the note value.
 */

import { and, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { stockMovements } from "../../../../infrastructure/database/schema/inventory.js";
import type { InventorySyncIdempotencyPort } from "../../domain/repositories.js";

export class DrizzleSyncIdempotency implements InventorySyncIdempotencyPort {
  constructor(private readonly db: DrizzleDb) {}

  async hasApplied(syncKey: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.note, syncKey),
          eq(stockMovements.source, "pickup"),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async markApplied(_syncKey: string): Promise<void> {
    void _syncKey;
    // No-op: the stock movement insert itself records the syncKey as note.
    // Subsequent hasApplied checks will find it.
  }
}
