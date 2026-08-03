/**
 * In-memory ProductRepository / CategoryRepository for unit tests.
 */

import type { Category } from "../../domain/category.js";
import type { Product } from "../../domain/product.js";
import type {
  CategoryRepository,
  ProductRepository,
} from "../../domain/repositories.js";

export class InMemoryProductRepository implements ProductRepository {
  private readonly byId = new Map<string, Product>();

  async save(product: Product): Promise<void> {
    this.byId.set(product.id, product);
  }

  async findById(id: string): Promise<Product | null> {
    return this.byId.get(id) ?? null;
  }

  async findByBarcode(
    merchantId: string,
    barcode: string,
  ): Promise<Product | null> {
    for (const product of this.byId.values()) {
      if (
        product.merchantId === merchantId &&
        product.barcode === barcode
      ) {
        return product;
      }
    }
    return null;
  }

  async findBySku(
    merchantId: string,
    sku: string,
  ): Promise<Product | null> {
    for (const product of this.byId.values()) {
      if (product.merchantId === merchantId && product.sku === sku) {
        return product;
      }
    }
    return null;
  }

  async listByMerchantId(
    merchantId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Product[]> {
    const includeDeleted = options?.includeDeleted === true;
    return [...this.byId.values()].filter(
      (p) =>
        p.merchantId === merchantId &&
        (includeDeleted || p.deletedAt === null),
    );
  }

  async update(product: Product): Promise<void> {
    this.byId.set(product.id, product);
  }
}

export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly byId = new Map<string, Category>();

  async save(category: Category): Promise<void> {
    this.byId.set(category.id, category);
  }

  async findById(id: string): Promise<Category | null> {
    return this.byId.get(id) ?? null;
  }

  async listByMerchantId(merchantId: string): Promise<Category[]> {
    return [...this.byId.values()].filter((c) => c.merchantId === merchantId);
  }
}
