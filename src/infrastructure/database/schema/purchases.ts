/**
 * Purchase & Procurement OLTP Tables (MerchantOS Phase 2).
 */

import {
  bigint,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    supplierId: uuid("supplier_id"),
    storeId: uuid("store_id").notNull(),
    purchaseNumber: varchar("purchase_number", { length: 50 }).notNull(),
    /** draft | confirmed | partial_received | received | cancelled */
    status: varchar("status", { length: 30 }).notNull().default("draft"),
    purchaseDate: date("purchase_date", { mode: "string" }).notNull(),
    invoiceNumber: varchar("invoice_number", { length: 100 }),
    subtotalMinor: bigint("subtotal_minor", { mode: "bigint" }).notNull().default(0n),
    discountAmountMinor: bigint("discount_amount_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    taxAmountMinor: bigint("tax_amount_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    shippingAmountMinor: bigint("shipping_amount_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    additionalCostsMinor: bigint("additional_costs_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull().default(0n),
    paidAmountMinor: bigint("paid_amount_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    /** unpaid | partial | paid */
    paymentStatus: varchar("payment_status", { length: 30 })
      .notNull()
      .default("unpaid"),
    notes: text("notes"),
    attachments: jsonb("attachments").default([]),
    metadata: jsonb("metadata").default({}),
    erpnextPurchaseId: varchar("erpnext_purchase_id", { length: 140 }),
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
    uniqueIndex("purchases_merchant_number_uq").on(
      t.merchantId,
      t.purchaseNumber,
    ),
    index("purchases_merchant_supplier_idx").on(t.merchantId, t.supplierId),
    index("purchases_merchant_date_idx").on(t.merchantId, t.purchaseDate),
    index("purchases_merchant_status_idx").on(t.merchantId, t.status),
  ],
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    purchaseId: uuid("purchase_id").notNull(),
    productId: uuid("product_id").notNull(),
    quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull(),
    unitCode: varchar("unit_code", { length: 32 }).notNull().default("piece"),
    unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }).notNull(),
    discountAmountMinor: bigint("discount_amount_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    taxAmountMinor: bigint("tax_amount_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
    receivedQuantity: numeric("received_quantity", {
      precision: 15,
      scale: 3,
    })
      .notNull()
      .default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("purchase_items_merchant_purchase_idx").on(
      t.merchantId,
      t.purchaseId,
    ),
    index("purchase_items_merchant_product_idx").on(
      t.merchantId,
      t.productId,
    ),
  ],
);

export const purchasePayments = pgTable(
  "purchase_payments",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    purchaseId: uuid("purchase_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    /** cash | bank_transfer | cheque */
    paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
    accountId: uuid("account_id"),
    reference: varchar("reference", { length: 255 }),
    paymentDate: date("payment_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("purchase_payments_merchant_purchase_idx").on(
      t.merchantId,
      t.purchaseId,
    ),
  ],
);
