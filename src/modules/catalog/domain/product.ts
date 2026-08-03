/**
 * Product aggregate root (ADR-008 Catalog).
 * Single-SKU MVP; barcode unique per merchant; price Money IRR minor units.
 */

import type { Money } from "../../../shared/domain/money.js";

export type Product = {
  readonly id: string;
  readonly merchantId: string;
  /** Persian product title. */
  name: string;
  description: string | null;
  sku: string;
  barcode: string;
  categoryId: string | null;
  /** Unit price in IRR minor units (rial). */
  price: Money;
  deletedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreateProductAggregateInput = {
  id: string;
  merchantId: string;
  name: string;
  description?: string | null;
  sku: string;
  barcode: string;
  categoryId?: string | null;
  price: Money;
  now?: Date;
};

export function createProductAggregate(
  input: CreateProductAggregateInput,
): Product {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    name: input.name,
    description: input.description ?? null,
    sku: input.sku,
    barcode: input.barcode,
    categoryId: input.categoryId ?? null,
    price: input.price,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function softDeleteProduct(
  product: Product,
  at: Date = new Date(),
): void {
  product.deletedAt = at;
  product.updatedAt = at;
}

export function isProductActive(product: Product): boolean {
  return product.deletedAt === null;
}
