/**
 * Catalog OLTP tables (ADR-008 / ARD-005) — Drizzle schema stub.
 *
 * - categories + products merchant-scoped
 * - Persian UTF-8 `text` for names/descriptions
 * - Money as bigint IRR minor units
 * - Partial unique barcode/sku per merchant deferred to migration CHECK/partial indexes
 *
 * Migrations via Drizzle Kit → ARD-005. Barcode search indexes → ADR-050.
 */

import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    /** Persian category name — UTF-8 text. */
    name: text("name").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (t) => [
    index("categories_merchant_id_idx").on(t.merchantId),
    index("categories_merchant_id_created_at_idx").on(
      t.merchantId,
      t.createdAt,
    ),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    categoryId: uuid("category_id"),
    /** Persian product title — UTF-8 text. */
    name: text("name").notNull(),
    description: text("description"),
    sku: varchar("sku", { length: 64 }).notNull(),
    barcode: varchar("barcode", { length: 64 }).notNull(),
    /** IRR minor units (rial). Display تومان in presentation. */
    priceAmountMinor: bigint("price_amount_minor", { mode: "bigint" }).notNull(),
    /**
     * MerchantOS base unit code (ADR-126). Default piece; weight units (kg/g)
     * supported in Quantity domain before stock/sale columns go decimal.
     */
    baseUnitCode: varchar("base_unit_code", { length: 32 })
      .notNull()
      .default("piece"),
    /**
     * Decimal scale for quantities expressed in base unit (0 = integer pieces).
     * Stock/sale columns remain integer until a later weight-product ADR.
     */
    quantityScale: integer("quantity_scale").notNull().default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (t) => [
    index("products_merchant_id_idx").on(t.merchantId),
    index("products_merchant_id_created_at_idx").on(t.merchantId, t.createdAt),
    uniqueIndex("products_merchant_id_barcode_uq").on(t.merchantId, t.barcode),
    uniqueIndex("products_merchant_id_sku_uq").on(t.merchantId, t.sku),
    index("products_category_id_idx").on(t.categoryId),
  ],
);
