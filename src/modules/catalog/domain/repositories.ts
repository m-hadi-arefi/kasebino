import type { Category } from "./category.js";
import type { Product } from "./product.js";

/** Domain ports — Drizzle adapters follow schema stubs (ARD-005 migrations). */
export type ProductRepository = {
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  findByBarcode(
    merchantId: string,
    barcode: string,
  ): Promise<Product | null>;
  findBySku(merchantId: string, sku: string): Promise<Product | null>;
  listByMerchantId(
    merchantId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Product[]>;
  update(product: Product): Promise<void>;
};

export type CategoryRepository = {
  save(category: Category): Promise<void>;
  findById(id: string): Promise<Category | null>;
  listByMerchantId(
    merchantId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Category[]>;
  update(category: Category): Promise<void>;
};
