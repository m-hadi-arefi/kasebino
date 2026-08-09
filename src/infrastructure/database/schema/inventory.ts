/**
 * Inventory OLTP tables (ADR-008 / ADR-049 / ADR-126).
 *
 * StockItem identity: merchant_id + store_id + product_id (ADR-091 store-scoped).
 * quantity >= 0 MVP; version for optimistic lock (ADR-049).
 * stock_movements: append-only operational ledger for integration/traceability (ADR-126).
 */

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
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

/**
 * Append-only stock movement ledger (ADR-126).
 * Operational traceability for sales/adjustments; not accounting valuation.
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    stockItemId: uuid("stock_item_id").notNull(),
    /** Signed delta in base unit (integer piece path today). */
    quantityDelta: integer("quantity_delta").notNull(),
    /** MerchantOS unit code — default piece (ADR-126 UOM foundation). */
    unitCode: varchar("unit_code", { length: 32 }).notNull().default("piece"),
    /**
     * sale | return | adjustment | transfer | receipt | damage |
     * purchase | pickup_paid | pickup_restore
     */
    reason: varchar("reason", { length: 32 }).notNull(),
    referenceType: varchar("reference_type", { length: 64 }),
    referenceId: varchar("reference_id", { length: 128 }),
    /** pos | pickup | adjust_api | system | integration */
    source: varchar("source", { length: 64 }).notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("stock_movements_merchant_store_occurred_idx").on(
      t.merchantId,
      t.storeId,
      t.occurredAt,
    ),
    index("stock_movements_product_id_idx").on(t.productId),
    index("stock_movements_stock_item_id_idx").on(t.stockItemId),
    index("stock_movements_reference_idx").on(t.referenceType, t.referenceId),
  ],
);
