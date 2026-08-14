/**
 * Supplier & Accounts Payable (AP) OLTP Tables (MerchantOS Phase 1).
 */

import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    province: varchar("province", { length: 100 }),
    nationalId: varchar("national_id", { length: 20 }),
    taxId: varchar("tax_id", { length: 20 }),
    /** Positive = merchant owes supplier (AP balance) */
    balanceMinor: bigint("balance_minor", { mode: "bigint" }).notNull().default(0n),
    creditLimitMinor: bigint("credit_limit_minor", { mode: "bigint" }),
    tags: jsonb("tags").default([]),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    erpnextSupplierId: varchar("erpnext_supplier_id", { length: 140 }),
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
    index("suppliers_merchant_id_idx").on(t.merchantId),
    index("suppliers_merchant_phone_idx").on(t.merchantId, t.phone),
  ],
);

export const supplierTransactions = pgTable(
  "supplier_transactions",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    /** purchase_credit | payment | return | advance | adjustment */
    transactionType: varchar("transaction_type", { length: 30 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    balanceAfterMinor: bigint("balance_after_minor", { mode: "bigint" }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: varchar("reference_id", { length: 128 }),
    description: text("description"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("supplier_tx_merchant_supplier_idx").on(
      t.merchantId,
      t.supplierId,
      t.createdAt,
    ),
  ],
);
