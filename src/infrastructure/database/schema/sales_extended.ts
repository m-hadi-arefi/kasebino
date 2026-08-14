/**
 * Sales Extended & Commercial Operations OLTP Tables (MerchantOS Phase 4, 5, 6).
 */

import {
  bigint,
  boolean,
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

export const salePayments = pgTable(
  "sale_payments",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    saleId: uuid("sale_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    /** cash | card | online | credit | wallet */
    tenderType: varchar("tender_type", { length: 30 }).notNull(),
    accountId: uuid("account_id"),
    reference: varchar("reference", { length: 255 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("sale_payments_merchant_sale_idx").on(t.merchantId, t.saleId),
  ],
);

export const returns = pgTable(
  "returns",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    /** customer | supplier */
    returnType: varchar("return_type", { length: 20 }).notNull(),
    returnNumber: varchar("return_number", { length: 50 }).notNull(),
    /** sale | order | purchase */
    originalReferenceType: varchar("original_reference_type", { length: 30 }),
    originalReferenceId: uuid("original_reference_id"),
    customerId: uuid("customer_id"),
    supplierId: uuid("supplier_id"),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
    refundMethod: varchar("refund_method", { length: 50 }),
    refundAccountId: uuid("refund_account_id"),
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    reason: text("reason"),
    notes: text("notes"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("returns_merchant_number_uq").on(
      t.merchantId,
      t.returnNumber,
    ),
  ],
);

export const returnItems = pgTable(
  "return_items",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    returnId: uuid("return_id").notNull(),
    productId: uuid("product_id").notNull(),
    quantity: numeric("quantity", { precision: 15, scale: 3 }).notNull(),
    unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }).notNull(),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
    costLayerId: uuid("cost_layer_id"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("return_items_merchant_return_idx").on(
      t.merchantId,
      t.returnId,
    ),
  ],
);

export const taxRates = pgTable(
  "tax_rates",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    rate: numeric("rate", { precision: 10, scale: 4 }).notNull(),
    /** percentage | fixed */
    type: varchar("type", { length: 30 }).notNull().default("percentage"),
    appliesTo: varchar("applies_to", { length: 30 }).notNull().default("all"),
    scopeId: uuid("scope_id"),
    isInclusive: boolean("is_inclusive").notNull().default(false),
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
    index("tax_rates_merchant_active_idx").on(t.merchantId, t.isActive),
  ],
);

export const taxSettings = pgTable(
  "tax_settings",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    defaultTaxRateId: uuid("default_tax_rate_id"),
    pricesIncludeTax: boolean("prices_include_tax").notNull().default(true),
    economicCode: varchar("economic_code", { length: 20 }),
    nationalId: varchar("national_id", { length: 20 }),
    moadianRegistered: boolean("moadian_registered").notNull().default(false),
    invoicePrefix: varchar("invoice_prefix", { length: 10 }),
    nextInvoiceNumber: bigint("next_invoice_number", { mode: "bigint" })
      .notNull()
      .default(1n),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [uniqueIndex("tax_settings_merchant_uq").on(t.merchantId)],
);

export const discountRules = pgTable(
  "discount_rules",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    /** item_percentage | item_fixed | invoice_percentage | invoice_fixed */
    type: varchar("type", { length: 30 }).notNull(),
    value: numeric("value", { precision: 15, scale: 2 }).notNull(),
    scopeType: varchar("scope_type", { length: 30 }),
    scopeId: uuid("scope_id"),
    minQuantity: numeric("min_quantity", { precision: 15, scale: 3 }),
    minAmountMinor: bigint("min_amount_minor", { mode: "bigint" }),
    maxDiscountMinor: bigint("max_discount_minor", { mode: "bigint" }),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    approvedByRole: varchar("approved_by_role", { length: 50 }),
    isActive: boolean("is_active").notNull().default(true),
    validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }),
    validUntil: timestamp("valid_until", { withTimezone: true, mode: "date" }),
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
    index("discount_rules_merchant_active_idx").on(t.merchantId, t.isActive),
  ],
);

export const saleDiscounts = pgTable(
  "sale_discounts",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    saleId: uuid("sale_id"),
    saleLineId: uuid("sale_line_id"),
    discountRuleId: uuid("discount_rule_id"),
    discountType: varchar("discount_type", { length: 30 }).notNull(),
    discountValue: numeric("discount_value", { precision: 15, scale: 2 }).notNull(),
    discountAmountMinor: bigint("discount_amount_minor", { mode: "bigint" }).notNull(),
    approvedBy: uuid("approved_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("sale_discounts_merchant_sale_idx").on(t.merchantId, t.saleId),
  ],
);

export const commissionRules = pgTable(
  "commission_rules",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    /** sales_amount | gross_profit | quantity */
    basis: varchar("basis", { length: 30 }).notNull(),
    rate: numeric("rate", { precision: 10, scale: 4 }).notNull(),
    scopeType: varchar("scope_type", { length: 30 }),
    scopeId: uuid("scope_id"),
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
  (t) => [index("commission_rules_merchant_idx").on(t.merchantId)],
);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    userId: uuid("user_id").notNull(),
    saleId: uuid("sale_id").notNull(),
    ruleId: uuid("rule_id"),
    basisAmountMinor: bigint("basis_amount_minor", { mode: "bigint" }).notNull(),
    commissionAmountMinor: bigint("commission_amount_minor", { mode: "bigint" }).notNull(),
    /** pending | settled | reversed */
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    settledAt: timestamp("settled_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("commissions_merchant_user_status_idx").on(
      t.merchantId,
      t.userId,
      t.status,
    ),
  ],
);

export const posTerminals = pgTable(
  "pos_terminals",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    bankAccountId: uuid("bank_account_id"),
    terminalId: varchar("terminal_id", { length: 50 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    config: jsonb("config").default({}),
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
    index("pos_terminals_merchant_store_idx").on(t.merchantId, t.storeId),
  ],
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    userId: uuid("user_id").notNull(),
    resource: varchar("resource", { length: 50 }).notNull(),
    actions: jsonb("actions").notNull(),
    storeScope: jsonb("store_scope"),
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
    uniqueIndex("permissions_merchant_user_resource_uq").on(
      t.merchantId,
      t.userId,
      t.resource,
    ),
  ],
);
