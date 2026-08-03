/**
 * Inventory OLTP table (ADR-008 / ARD-006) — Drizzle schema stub.
 *
 * StockItem identity: merchant_id + store_id + product_id (ADR-091 store-scoped).
 * quantity >= 0 MVP; version for optimistic lock (ADR-049).
 * Sale/pickup sync: see src/inventory-sync (CompleteSale TX; pickup on paid).
 *
 * Migrations via Drizzle Kit → ARD-006.
 */

import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const stockItems = pgTable(
  "stock_items",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    reorderLevel: integer("reorder_level").notNull(),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("stock_items_merchant_store_product_uq").on(
      t.merchantId,
      t.storeId,
      t.productId,
    ),
    index("stock_items_merchant_id_store_id_idx").on(t.merchantId, t.storeId),
    index("stock_items_product_id_idx").on(t.productId),
  ],
);
