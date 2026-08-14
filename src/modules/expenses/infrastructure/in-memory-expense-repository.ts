/**
 * In-Memory Expense Repository Implementation (MerchantOS Phase 4).
 */

import { ExpenseRepository } from "../application/expense-use-cases.js";
import {
  Expense,
  ExpenseCategory,
  ExpenseCategoryId,
  ExpenseId,
  RecordExpenseInput,
} from "../domain/expenses.js";

export class InMemoryExpenseRepository implements ExpenseRepository {
  private categories = new Map<string, ExpenseCategory>();
  private expenses: Expense[] = [];

  private getKey(merchantId: string, id: string): string {
    return `${merchantId}:${id}`;
  }

  async getCategory(merchantId: string, id: ExpenseCategoryId): Promise<ExpenseCategory | null> {
    return this.categories.get(this.getKey(merchantId, id)) ?? null;
  }

  async listCategories(merchantId: string): Promise<ExpenseCategory[]> {
    return Array.from(this.categories.values())
      .filter((c) => c.merchantId === merchantId && c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createCategory(input: {
    merchantId: string;
    name: string;
    accountId?: string;
    sortOrder?: number;
  }): Promise<ExpenseCategory> {
    const id = crypto.randomUUID();
    const category: ExpenseCategory = {
      id,
      merchantId: input.merchantId,
      name: input.name,
      accountId: input.accountId,
      isSystem: false,
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
      createdAt: new Date(),
    };
    this.categories.set(this.getKey(input.merchantId, id), category);
    return category;
  }

  async getExpense(merchantId: string, id: ExpenseId): Promise<Expense | null> {
    return this.expenses.find((e) => e.merchantId === merchantId && e.id === id) ?? null;
  }

  async listExpenses(filter: {
    merchantId: string;
    storeId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Expense[]> {
    let list = this.expenses.filter((e) => e.merchantId === filter.merchantId);
    if (filter.storeId) list = list.filter((e) => e.storeId === filter.storeId);
    if (filter.categoryId) list = list.filter((e) => e.categoryId === filter.categoryId);
    return list;
  }

  async recordExpense(input: RecordExpenseInput): Promise<Expense> {
    const id = crypto.randomUUID();
    const now = new Date();
    const expense: Expense = {
      id,
      merchantId: input.merchantId,
      storeId: input.storeId,
      categoryId: input.categoryId,
      amountMinor: input.amountMinor,
      paymentMethod: input.paymentMethod,
      accountId: input.accountId,
      expenseDate: input.expenseDate,
      description: input.description,
      attachments: input.attachments ?? [],
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.expenses.push(expense);
    return expense;
  }
}
