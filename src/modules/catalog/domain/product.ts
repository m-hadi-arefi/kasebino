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
  /** Optional operational cost in IRR minor units for margin hints (ADR-152). */
  cost: Money | null;
  /** MinIO object key for primary product image (ADR-147). */
  imageObjectKey: string | null;
  imageUpdatedAt: Date | null;
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
  cost?: Money | null;
  imageObjectKey?: string | null;
  imageUpdatedAt?: Date | null;
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
    cost: input.cost ?? null,
    imageObjectKey: input.imageObjectKey ?? null,
    imageUpdatedAt: input.imageUpdatedAt ?? null,
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

export type ApplyProductUpdateInput = {
  name: string;
  description: string | null;
  sku: string;
  barcode: string;
  categoryId: string | null;
  price: Money;
  cost?: Money | null;
  now?: Date;
};

export function applyProductUpdate(
  product: Product,
  input: ApplyProductUpdateInput,
): void {
  if (product.deletedAt !== null) {
    throw new Error("Cannot update soft-deleted product");
  }
  const at = input.now ?? new Date();
  product.name = input.name;
  product.description = input.description;
  product.sku = input.sku;
  product.barcode = input.barcode;
  product.categoryId = input.categoryId;
  product.price = input.price;
  if (input.cost !== undefined) {
    product.cost = input.cost;
  }
  product.updatedAt = at;
}

export function isProductActive(product: Product): boolean {
  return product.deletedAt === null;
}
