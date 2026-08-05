/**
 * Category aggregate (ADR-008 Catalog).
 * Merchant-scoped grouping for products.
 */

export type Category = {
  readonly id: string;
  readonly merchantId: string;
  /** Persian-capable category name. */
  name: string;
  deletedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreateCategoryAggregateInput = {
  id: string;
  merchantId: string;
  name: string;
  now?: Date;
};

export function createCategoryAggregate(
  input: CreateCategoryAggregateInput,
): Category {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    name: input.name,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function renameCategory(
  category: Category,
  name: string,
  at: Date = new Date(),
): void {
  category.name = name;
  category.updatedAt = at;
}

export function softDeleteCategory(
  category: Category,
  at: Date = new Date(),
): void {
  category.deletedAt = at;
  category.updatedAt = at;
}
