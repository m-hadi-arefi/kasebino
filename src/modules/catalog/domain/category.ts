/**
 * Category aggregate (ADR-008 Catalog).
 * Merchant-scoped grouping for products.
 */

export type Category = {
  readonly id: string;
  readonly merchantId: string;
  /** Persian-capable category name. */
  name: string;
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
    createdAt: now,
    updatedAt: now,
  };
}
