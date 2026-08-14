/**
 * Product Extensions & Commercial Config OLTP Tables (MerchantOS Phase 5).
 */

import {
  bigint,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    productId: uuid("product_id").notNull(),
    /** selling | purchase_cost | wholesale | promotional | minimum */
    priceType: varchar("price_type", { length: 30 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    previousAmountMinor: bigint("previous_amount_minor", { mode: "bigint" }),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    effectiveUntil: timestamp("effective_until", {
      withTimezone: true,
      mode: "date",
    }),
    changedBy: uuid("changed_by"),
    changeReason: text("change_reason"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("price_history_merchant_product_idx").on(
      t.merchantId,
      t.productId,
      t.priceType,
      t.effectiveFrom,
    ),
  ],
);

export const productPrices = pgTable(
  "product_prices",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    productId: uuid("product_id").notNull(),
    priceType: varchar("price_type", { length: 30 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
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
    uniqueIndex("product_prices_merchant_product_type_uq").on(
      t.merchantId,
      t.productId,
      t.priceType,
    ),
  ],
);

export const productChannelVisibility = pgTable(
  "product_channel_visibility",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    productId: uuid("product_id").notNull(),
    /** pos | online | internal */
    channel: varchar("channel", { length: 30 }).notNull(),
    storeId: uuid("store_id"),
    isVisible: boolean("is_visible").notNull().default(true),
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
    uniqueIndex("channel_vis_merchant_product_channel_store_uq").on(
      t.merchantId,
      t.productId,
      t.channel,
      t.storeId,
    ),
  ],
);

export const productUnits = pgTable(
  "product_units",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    productId: uuid("product_id").notNull(),
    baseUnit: varchar("base_unit", { length: 32 }).notNull().default("piece"),
    sellingUnit: varchar("selling_unit", { length: 32 }).notNull().default("piece"),
    purchaseUnit: varchar("purchase_unit", { length: 32 }).notNull().default("piece"),
    conversionFactor: numeric("conversion_factor", { precision: 15, scale: 6 })
      .notNull()
      .default("1"),
    allowFractional: boolean("allow_fractional").notNull().default(false),
    decimalPlaces: integer("decimal_places").notNull().default(0),
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
    uniqueIndex("product_units_merchant_product_uq").on(
      t.merchantId,
      t.productId,
    ),
  ],
);
