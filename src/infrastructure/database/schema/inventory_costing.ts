/**
 * Inventory Costing & Stock Operations OLTP Tables (MerchantOS Phase 2 & 6).
 */

import {
  bigint,
  boolean,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const inventoryCostLayers = pgTable(
  "inventory_cost_layers",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    purchaseId: uuid("purchase_id"),
    supplierId: uuid("supplier_id"),
    layerDate: date("layer_date", { mode: "string" }).notNull(),
    originalQuantity: numeric("original_quantity", { precision: 15, scale: 3 }).notNull(),
    remainingQuantity: numeric("remaining_quantity", { precision: 15, scale: 3 }).notNull(),
    unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }).notNull(),
    unitCode: varchar("unit_code", { length: 32 }).notNull().default("piece"),
    batchNumber: varchar("batch_number", { length: 100 }),
    expiryDate: date("expiry_date", { mode: "string" }),
    notes: text("notes"),
    isDepleted: boolean("is_depleted").notNull().default(false),
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
    index("cost_layers_merchant_store_product_depleted_idx").on(
      t.merchantId,
      t.storeId,
      t.productId,
      t.isDepleted,
    ),
    index("cost_layers_merchant_product_date_idx").on(
      t.merchantId,
      t.productId,
      t.layerDate,
    ),
    index("cost_layers_expiry_idx").on(t.merchantId, t.expiryDate),
  ],
);

export const inventoryValuationSettings = pgTable(
  "inventory_valuation_settings",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    /** merchant | category | product */
    scopeType: varchar("scope_type", { length: 30 }).notNull(),
    scopeId: uuid("scope_id"),
    /** fifo | lifo | weighted_average */
    method: varchar("method", { length: 20 }).notNull().default("fifo"),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("val_settings_merchant_scope_uq").on(
      t.merchantId,
      t.scopeType,
      t.scopeId,
    ),
  ],
);

export const costLayerConsumptions = pgTable(
  "cost_layer_consumptions",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    costLayerId: uuid("cost_layer_id").notNull(),
    /** sale | return_reversal | waste | transfer */
    referenceType: varchar("reference_type", { length: 50 }).notNull(),
    referenceId: varchar("reference_id", { length: 128 }).notNull(),
    quantityConsumed: numeric("quantity_consumed", { precision: 15, scale: 3 }).notNull(),
    unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }).notNull(),
    consumedAt: timestamp("consumed_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("consumptions_merchant_layer_idx").on(
      t.merchantId,
      t.costLayerId,
    ),
    index("consumptions_merchant_ref_idx").on(
      t.merchantId,
      t.referenceType,
      t.referenceId,
    ),
  ],
);

export const stockCounts = pgTable(
  "stock_counts",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    countNumber: varchar("count_number", { length: 50 }).notNull(),
    /** in_progress | completed | cancelled */
    status: varchar("status", { length: 20 }).notNull().default("in_progress"),
    countDate: date("count_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    countedBy: uuid("counted_by"),
    approvedBy: uuid("approved_by"),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
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
    uniqueIndex("stock_counts_merchant_number_uq").on(
      t.merchantId,
      t.countNumber,
    ),
  ],
);

export const stockCountItems = pgTable(
  "stock_count_items",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    countId: uuid("count_id").notNull(),
    productId: uuid("product_id").notNull(),
    expectedQuantity: numeric("expected_quantity", { precision: 15, scale: 3 }).notNull(),
    actualQuantity: numeric("actual_quantity", { precision: 15, scale: 3 }),
    variance: numeric("variance", { precision: 15, scale: 3 }),
    varianceReason: text("variance_reason"),
    unitCode: varchar("unit_code", { length: 32 }).notNull().default("piece"),
    scannedBarcode: varchar("scanned_barcode", { length: 100 }),
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
    index("stock_count_items_merchant_count_idx").on(
      t.merchantId,
      t.countId,
    ),
  ],
);

export const wasteRecords = pgTable(
  "waste_records",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull(),
    unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }).notNull(),
    totalValueMinor: bigint("total_value_minor", { mode: "bigint" }).notNull(),
    /** spoilage | expiry | damage | theft | loss | production */
    reason: varchar("reason", { length: 30 }).notNull(),
    costLayerId: uuid("cost_layer_id"),
    notes: text("notes"),
    recordedBy: uuid("recorded_by"),
    recordedAt: timestamp("recorded_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("waste_records_merchant_store_date_idx").on(
      t.merchantId,
      t.storeId,
      t.recordedAt,
    ),
    index("waste_records_merchant_reason_idx").on(t.merchantId, t.reason),
  ],
);

export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    fromStoreId: uuid("from_store_id").notNull(),
    toStoreId: uuid("to_store_id").notNull(),
    transferNumber: varchar("transfer_number", { length: 50 }).notNull(),
    /** pending | in_transit | received | cancelled */
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    notes: text("notes"),
    createdBy: uuid("created_by"),
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
    uniqueIndex("stock_transfers_merchant_number_uq").on(
      t.merchantId,
      t.transferNumber,
    ),
  ],
);

export const stockTransferItems = pgTable(
  "stock_transfer_items",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    transferId: uuid("transfer_id").notNull(),
    productId: uuid("product_id").notNull(),
    quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull(),
    unitCode: varchar("unit_code", { length: 32 }).notNull().default("piece"),
    costLayerId: uuid("cost_layer_id"),
    unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("stock_transfer_items_merchant_transfer_idx").on(
      t.merchantId,
      t.transferId,
    ),
  ],
);
