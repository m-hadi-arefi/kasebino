/**
 * Drizzle catalog repositories (ADR-093 / ADR-008).
 */

import { and, asc, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  categories,
  products,
} from "../../../../infrastructure/database/schema/catalog.js";
import {
  assertMerchantId,
  notDeleted,
} from "../../../../infrastructure/persistence/helpers.js";
import { moneyFromMinor } from "../../../../shared/domain/money.js";
import type { Category } from "../../domain/category.js";
import type { Product } from "../../domain/product.js";
import type {
  CategoryRepository,
  ProductRepository,
} from "../../domain/repositories.js";

type ProductRow = typeof products.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    merchantId: row.merchantId,
    name: row.name,
    description: row.description,
    sku: row.sku,
    barcode: row.barcode,
    categoryId: row.categoryId,
    price: moneyFromMinor(row.priceAmountMinor),
    cost: row.costAmountMinor !== null ? moneyFromMinor(row.costAmountMinor) : null,
    imageObjectKey: row.imageObjectKey,
    imageUpdatedAt: row.imageUpdatedAt,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    merchantId: row.merchantId,
    name: row.name,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleProductRepository implements ProductRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(product: Product): Promise<void> {
    await this.db.insert(products).values({
      id: product.id,
      merchantId: product.merchantId,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      priceAmountMinor: product.price.amountMinor,
      costAmountMinor: product.cost ? product.cost.amountMinor : null,
      imageObjectKey: product.imageObjectKey,
      imageUpdatedAt: product.imageUpdatedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    });
  }

  async findById(id: string): Promise<Product | null> {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return rows[0] ? toProduct(rows[0]) : null;
  }

  async findByBarcode(
    merchantId: string,
    barcode: string,
  ): Promise<Product | null> {
    assertMerchantId(merchantId);
    const rows = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.merchantId, merchantId),
          eq(products.barcode, barcode),
          notDeleted(products.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toProduct(rows[0]) : null;
  }

  async findBySku(merchantId: string, sku: string): Promise<Product | null> {
    assertMerchantId(merchantId);
    const rows = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.merchantId, merchantId),
          eq(products.sku, sku),
          notDeleted(products.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toProduct(rows[0]) : null;
  }

  async listByMerchantId(
    merchantId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Product[]> {
    assertMerchantId(merchantId);
    const includeDeleted = options?.includeDeleted === true;
    const conditions = [eq(products.merchantId, merchantId)];
    if (!includeDeleted) {
      conditions.push(notDeleted(products.deletedAt));
    }
    const rows = await this.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.createdAt));
    return rows.map(toProduct);
  }

  async update(product: Product): Promise<void> {
    await this.db
      .update(products)
      .set({
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        priceAmountMinor: product.price.amountMinor,
        costAmountMinor: product.cost ? product.cost.amountMinor : null,
        imageObjectKey: product.imageObjectKey,
        imageUpdatedAt: product.imageUpdatedAt,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
      })
      .where(
        and(
          eq(products.id, product.id),
          eq(products.merchantId, product.merchantId),
        ),
      );
  }
}

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(category: Category): Promise<void> {
    await this.db.insert(categories).values({
      id: category.id,
      merchantId: category.merchantId,
      name: category.name,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
    });
  }

  async findById(id: string): Promise<Category | null> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return rows[0] ? toCategory(rows[0]) : null;
  }

  async listByMerchantId(
    merchantId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Category[]> {
    assertMerchantId(merchantId);
    const includeDeleted = options?.includeDeleted === true;
    const conditions = [eq(categories.merchantId, merchantId)];
    if (!includeDeleted) {
      conditions.push(notDeleted(categories.deletedAt));
    }
    const rows = await this.db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.createdAt));
    return rows.map(toCategory);
  }

  async update(category: Category): Promise<void> {
    await this.db
      .update(categories)
      .set({
        name: category.name,
        updatedAt: category.updatedAt,
        deletedAt: category.deletedAt,
      })
      .where(
        and(
          eq(categories.id, category.id),
          eq(categories.merchantId, category.merchantId),
        ),
      );
  }
}
