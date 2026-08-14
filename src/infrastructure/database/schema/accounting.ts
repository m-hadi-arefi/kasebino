/**
 * Operational Accounting OLTP Tables (MerchantOS Phase 1).
 *
 * Provides instant real-time operational accounting, cash/bank treasury,
 * expenses, and double-entry append-only transaction ledger.
 */

import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const operationalAccounts = pgTable(
  "operational_accounts",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    /** asset | liability | equity | revenue | cogs | expense | contra_revenue */
    type: varchar("type", { length: 32 }).notNull(),
    /** cash | bank | receivable | payable | inventory | sales | general | rent | etc. */
    subType: varchar("sub_type", { length: 64 }),
    parentId: uuid("parent_id"),
    balanceMinor: bigint("balance_minor", { mode: "bigint" }).notNull().default(0n),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").default({}),
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
    uniqueIndex("operational_accounts_merchant_code_uq").on(
      t.merchantId,
      t.code,
    ),
    index("operational_accounts_merchant_id_idx").on(t.merchantId),
    index("operational_accounts_type_sub_type_idx").on(t.type, t.subType),
  ],
);

export const operationalTransactions = pgTable(
  "operational_transactions",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    description: varchar("description", { length: 500 }),
    /** sale | purchase | expense | transfer | adjustment | return | payment */
    referenceType: varchar("reference_type", { length: 64 }),
    referenceId: varchar("reference_id", { length: 128 }),
    debitAccountId: uuid("debit_account_id").notNull(),
    creditAccountId: uuid("credit_account_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    metadata: jsonb("metadata").default({}),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("op_tx_merchant_date_idx").on(t.merchantId, t.transactionDate),
    index("op_tx_ref_idx").on(t.merchantId, t.referenceType, t.referenceId),
    index("op_tx_debit_idx").on(t.merchantId, t.debitAccountId),
    index("op_tx_credit_idx").on(t.merchantId, t.creditAccountId),
  ],
);

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    accountId: uuid("account_id"),
    isSystem: boolean("is_system").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("expense_categories_merchant_name_uq").on(
      t.merchantId,
      t.name,
    ),
    index("expense_categories_merchant_id_idx").on(t.merchantId),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id"),
    categoryId: uuid("category_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    paymentMethod: varchar("payment_method", { length: 32 }).notNull(),
    accountId: uuid("account_id").notNull(),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    description: text("description"),
    attachments: jsonb("attachments").default([]),
    transactionId: uuid("transaction_id"),
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
    index("expenses_merchant_date_idx").on(t.merchantId, t.expenseDate),
    index("expenses_category_idx").on(t.merchantId, t.categoryId),
  ],
);

export const cashRegisters = pgTable(
  "cash_registers",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    accountId: uuid("account_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    openingBalanceMinor: bigint("opening_balance_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    currentBalanceMinor: bigint("current_balance_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    isDefault: boolean("is_default").notNull().default(false),
    responsibleUserId: uuid("responsible_user_id"),
    status: varchar("status", { length: 20 }).notNull().default("open"),
    lastClosedAt: timestamp("last_closed_at", {
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
    index("cash_registers_merchant_store_idx").on(t.merchantId, t.storeId),
  ],
);

export const cashClosings = pgTable(
  "cash_closings",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    registerId: uuid("register_id").notNull(),
    closingDate: date("closing_date", { mode: "string" }).notNull(),
    openingBalanceMinor: bigint("opening_balance_minor", { mode: "bigint" }).notNull(),
    salesCashMinor: bigint("sales_cash_minor", { mode: "bigint" }).notNull(),
    expensesMinor: bigint("expenses_minor", { mode: "bigint" }).notNull(),
    transfersOutMinor: bigint("transfers_out_minor", { mode: "bigint" }).notNull(),
    expectedBalanceMinor: bigint("expected_balance_minor", { mode: "bigint" }).notNull(),
    actualCountMinor: bigint("actual_count_minor", { mode: "bigint" }),
    varianceMinor: bigint("variance_minor", { mode: "bigint" }),
    varianceReason: text("variance_reason"),
    closedBy: uuid("closed_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("cash_closings_register_date_idx").on(
      t.merchantId,
      t.registerId,
      t.closingDate,
    ),
  ],
);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    accountId: uuid("account_id").notNull(),
    bankName: varchar("bank_name", { length: 255 }).notNull(),
    accountNumber: varchar("account_number", { length: 50 }),
    iban: varchar("iban", { length: 34 }),
    cardNumber: varchar("card_number", { length: 19 }),
    accountHolder: varchar("account_holder", { length: 255 }),
    currentBalanceMinor: bigint("current_balance_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    isDefault: boolean("is_default").notNull().default(false),
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
  (t) => [index("bank_accounts_merchant_id_idx").on(t.merchantId)],
);

export const fundTransfers = pgTable(
  "fund_transfers",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    fromAccountId: uuid("from_account_id").notNull(),
    toAccountId: uuid("to_account_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    transferDate: date("transfer_date", { mode: "string" }).notNull(),
    reference: varchar("reference", { length: 255 }),
    notes: text("notes"),
    transactionId: uuid("transaction_id"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [index("fund_transfers_merchant_date_idx").on(t.merchantId, t.transferDate)],
);
