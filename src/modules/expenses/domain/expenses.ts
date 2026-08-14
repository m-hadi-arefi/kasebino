/**
 * Operational Expenses Domain Types (MerchantOS Phase 4).
 */

export type ExpenseCategoryId = string;
export type ExpenseId = string;

export type ExpenseCategory = {
  readonly id: ExpenseCategoryId;
  readonly merchantId: string;
  readonly name: string;
  readonly accountId?: string;
  readonly isSystem: boolean;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
};

export type Expense = {
  readonly id: ExpenseId;
  readonly merchantId: string;
  readonly storeId?: string;
  readonly categoryId: ExpenseCategoryId;
  readonly amountMinor: bigint;
  readonly paymentMethod: "cash" | "bank";
  readonly accountId: string;
  readonly expenseDate: string;
  readonly description?: string;
  readonly attachments: readonly string[];
  readonly transactionId?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type RecordExpenseInput = {
  readonly merchantId: string;
  readonly storeId?: string;
  readonly categoryId: ExpenseCategoryId;
  readonly amountMinor: bigint;
  readonly paymentMethod: "cash" | "bank";
  readonly accountId: string;
  readonly expenseDate: string;
  readonly description?: string;
  readonly attachments?: readonly string[];
  readonly createdBy?: string;
};
