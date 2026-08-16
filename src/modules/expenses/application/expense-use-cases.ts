/**
 * Expenses Application Use-Cases & Repository Interface (MerchantOS Phase 4).
 */

import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryId,
  ExpenseId,
  RecordExpenseInput,
} from "../domain/expenses.js";

export interface ExpenseRepository {
  getCategory(merchantId: string, id: ExpenseCategoryId): Promise<ExpenseCategory | null>;
  listCategories(merchantId: string): Promise<ExpenseCategory[]>;
  createCategory(input: {
    merchantId: string;
    name: string;
    accountId?: string;
    sortOrder?: number;
  }): Promise<ExpenseCategory>;

  getExpense(merchantId: string, id: ExpenseId): Promise<Expense | null>;
  listExpenses(filter: {
    merchantId: string;
    storeId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Expense[]>;
  recordExpense(input: RecordExpenseInput): Promise<Expense>;
}

export class RecordExpenseUseCase {
  constructor(private readonly repo: ExpenseRepository) {}

  async execute(input: RecordExpenseInput): Promise<Expense> {
    if (input.amountMinor <= 0n) {
      throw new Error("Expense amount must be positive");
    }
    const category = await this.repo.getCategory(input.merchantId, input.categoryId);
    if (!category) {
      throw new Error(`Expense category ${input.categoryId} not found`);
    }
    return this.repo.recordExpense(input);
  }
}
