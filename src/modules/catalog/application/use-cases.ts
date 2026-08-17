import { randomUUID } from "node:crypto";

import {
  normalizeBarcode,
  normalizeSearchText,
} from "../domain/search-barcode/index.js";
import {
  formatTomanDisplay,
  moneyFromMinor,
  type Money,
} from "../../../shared/domain/money.js";
import {
  createCategoryAggregate,
  renameCategory,
  softDeleteCategory,
  type Category,
} from "../domain/category.js";
import {
  productCreatedEvent,
  productDeletedEvent,
  productUpdatedEvent,
} from "../domain/events.js";
import {
  applyProductUpdate,
  createProductAggregate,
  softDeleteProduct,
  type Product,
} from "../domain/product.js";
import type {
  CategoryRepository,
  ProductRepository,
} from "../domain/repositories.js";
import { CatalogDomainError } from "./errors.js";
import {
  MINIO_BUCKETS,
  buildObjectKey,
  putValidatedObject,
  type ObjectStoragePort,
} from "../../../infrastructure/minio/contracts/index.js";

const NAME_MAX = 200;
const SKU_MAX = 64;
const BARCODE_MAX = 64;
const DESCRIPTION_MAX = 2000;
const BARCODE_PATTERN = /^[0-9A-Za-z\-_.]+$/;
const SKU_PATTERN = /^[0-9A-Za-z\-_.]+$/;

export type CatalogUseCaseDeps = {
  products: ProductRepository;
  categories: CategoryRepository;
  objectStorage?: ObjectStoragePort;
  now?: () => Date;
  idFactory?: () => string;
};

export type CreateCategoryInput = {
  merchantId: string;
  name: string;
};

export type CreateCategoryResult = {
  category: Category;
};

export type CreateProductInput = {
  merchantId: string;
  name: string;
  sku: string;
  barcode: string;
  /** IRR minor units (rial). Number or bigint. */
  priceAmountMinor: number | bigint;
  /** Optional operational cost in IRR minor units for margin hints (ADR-152). */
  costAmountMinor?: number | bigint | null;
  description?: string | null;
  categoryId?: string | null;
};

export type CreateProductResult = {
  product: Product;
  event: ReturnType<typeof productCreatedEvent>;
  /** تومان display helper for presentation layers. */
  priceDisplayToman: string;
};

export type SoftDeleteProductInput = {
  productId: string;
};

export type SoftDeleteProductResult = {
  product: Product;
  event: ReturnType<typeof productDeletedEvent>;
};

export type UpdateProductInput = {
  productId: string;
  merchantId: string;
  name: string;
  sku: string;
  barcode: string;
  priceAmountMinor: number | bigint;
  costAmountMinor?: number | bigint | null;
  description?: string | null;
  categoryId?: string | null;
};

export type UpdateProductResult = {
  product: Product;
  event: ReturnType<typeof productUpdatedEvent>;
  priceDisplayToman: string;
};

export type UpdateCategoryInput = {
  categoryId: string;
  merchantId: string;
  name: string;
};

export type UpdateCategoryResult = {
  category: Category;
};

export type SoftDeleteCategoryInput = {
  categoryId: string;
  merchantId: string;
};

export type SoftDeleteCategoryResult = {
  category: Category;
};

export type LookupByBarcodeInput = {
  merchantId: string;
  barcode: string;
};

export type LookupByBarcodeResult = {
  product: Product | null;
};

export type SearchByNameInput = {
  merchantId: string;
  query: string;
  /** Default 20; caps POS typeahead size. */
  limit?: number;
};

export type SearchByNameResult = {
  products: Product[];
};

const SEARCH_DEFAULT_LIMIT = 20;
const SEARCH_MAX_LIMIT = 50;

function requireName(raw: string): string {
  const name = raw.trim();
  if (!name || name.length > NAME_MAX) {
    throw new CatalogDomainError("INVALID_PRODUCT_NAME");
  }
  return name;
}

function requireCategoryName(raw: string): string {
  const name = raw.trim();
  if (!name || name.length > NAME_MAX) {
    throw new CatalogDomainError("INVALID_CATEGORY_NAME");
  }
  return name;
}

function requireSku(raw: string): string {
  const sku = raw.trim();
  if (!sku || sku.length > SKU_MAX || !SKU_PATTERN.test(sku)) {
    throw new CatalogDomainError("INVALID_SKU");
  }
  return sku;
}

function requireBarcode(raw: string): string {
  const barcode = normalizeBarcode(raw);
  if (
    !barcode ||
    barcode.length > BARCODE_MAX ||
    !BARCODE_PATTERN.test(barcode)
  ) {
    throw new CatalogDomainError("INVALID_BARCODE");
  }
  return barcode;
}

function requirePrice(amountMinor: number | bigint): Money {
  try {
    return moneyFromMinor(amountMinor);
  } catch {
    throw new CatalogDomainError("INVALID_PRICE");
  }
}

function optionalCost(amountMinor?: number | bigint | null): Money | null {
  if (amountMinor === undefined || amountMinor === null) {
    return null;
  }
  try {
    return moneyFromMinor(amountMinor);
  } catch {
    throw new CatalogDomainError("INVALID_PRICE");
  }
}

function optionalDescription(
  raw: string | null | undefined,
): string | null {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return null;
  }
  const description = raw.trim();
  if (description.length > DESCRIPTION_MAX) {
    throw new CatalogDomainError("INVALID_PRODUCT_NAME");
  }
  return description;
}

export function createCatalogUseCases(deps: CatalogUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  async function createCategory(
    input: CreateCategoryInput,
  ): Promise<CreateCategoryResult> {
    const merchantId = input.merchantId.trim();
    const name = requireCategoryName(input.name);
    const at = now();
    const category = createCategoryAggregate({
      id: idFactory(),
      merchantId,
      name,
      now: at,
    });
    await deps.categories.save(category);
    return { category };
  }

  async function createProduct(
    input: CreateProductInput,
  ): Promise<CreateProductResult> {
    const merchantId = input.merchantId.trim();
    const name = requireName(input.name);
    const sku = requireSku(input.sku);
    const barcode = requireBarcode(input.barcode);
    const price = requirePrice(input.priceAmountMinor);
    const cost = optionalCost(input.costAmountMinor);
    const description = optionalDescription(input.description);

    let categoryId: string | null = null;
    if (
      input.categoryId !== undefined &&
      input.categoryId !== null &&
      input.categoryId.trim() !== ""
    ) {
      const category = await deps.categories.findById(input.categoryId.trim());
      if (
        !category ||
        category.merchantId !== merchantId ||
        category.deletedAt !== null
      ) {
        throw new CatalogDomainError("CATEGORY_NOT_FOUND");
      }
      categoryId = category.id;
    }

    const existingBarcode = await deps.products.findByBarcode(
      merchantId,
      barcode,
    );
    if (existingBarcode && existingBarcode.deletedAt === null) {
      throw new CatalogDomainError("BARCODE_TAKEN");
    }

    const existingSku = await deps.products.findBySku(merchantId, sku);
    if (existingSku && existingSku.deletedAt === null) {
      throw new CatalogDomainError("SKU_TAKEN");
    }

    const at = now();
    const product = createProductAggregate({
      id: idFactory(),
      merchantId,
      name,
      sku,
      barcode,
      price,
      cost,
      description,
      categoryId,
      now: at,
    });

    await deps.products.save(product);

    const event = productCreatedEvent({
      productId: product.id,
      merchantId: product.merchantId,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      priceAmountMinor: product.price.amountMinor.toString(),
      categoryId: product.categoryId,
      occurredAt: at,
    });

    return {
      product,
      event,
      priceDisplayToman: formatTomanDisplay(product.price),
    };
  }

  async function softDeleteProductById(
    input: SoftDeleteProductInput,
  ): Promise<SoftDeleteProductResult> {
    const product = await deps.products.findById(input.productId);
    if (!product) {
      throw new CatalogDomainError("PRODUCT_NOT_FOUND");
    }
    if (product.deletedAt !== null) {
      throw new CatalogDomainError("PRODUCT_ALREADY_DELETED");
    }

    const at = now();
    softDeleteProduct(product, at);
    await deps.products.update(product);

    const event = productDeletedEvent({
      productId: product.id,
      merchantId: product.merchantId,
      barcode: product.barcode,
      occurredAt: at,
    });

    return { product, event };
  }

  async function updateProduct(
    input: UpdateProductInput,
  ): Promise<UpdateProductResult> {
    const merchantId = input.merchantId.trim();
    const product = await deps.products.findById(input.productId);
    if (!product || product.merchantId !== merchantId) {
      throw new CatalogDomainError("PRODUCT_NOT_FOUND");
    }
    if (product.deletedAt !== null) {
      throw new CatalogDomainError("PRODUCT_ALREADY_DELETED");
    }

    const name = requireName(input.name);
    const sku = requireSku(input.sku);
    const barcode = requireBarcode(input.barcode);
    const price = requirePrice(input.priceAmountMinor);
    const cost = input.costAmountMinor !== undefined ? optionalCost(input.costAmountMinor) : undefined;
    const description = optionalDescription(input.description);

    let categoryId: string | null = null;
    if (
      input.categoryId !== undefined &&
      input.categoryId !== null &&
      input.categoryId.trim() !== ""
    ) {
      const category = await deps.categories.findById(input.categoryId.trim());
      if (
        !category ||
        category.merchantId !== merchantId ||
        category.deletedAt !== null
      ) {
        throw new CatalogDomainError("CATEGORY_NOT_FOUND");
      }
      categoryId = category.id;
    } else if (input.categoryId === null) {
      categoryId = null;
    } else {
      categoryId = product.categoryId;
    }

    const previousBarcode = product.barcode;
    if (barcode !== previousBarcode) {
      const existingBarcode = await deps.products.findByBarcode(
        merchantId,
        barcode,
      );
      if (
        existingBarcode &&
        existingBarcode.deletedAt === null &&
        existingBarcode.id !== product.id
      ) {
        throw new CatalogDomainError("BARCODE_TAKEN");
      }
    }

    if (sku !== product.sku) {
      const existingSku = await deps.products.findBySku(merchantId, sku);
      if (
        existingSku &&
        existingSku.deletedAt === null &&
        existingSku.id !== product.id
      ) {
        throw new CatalogDomainError("SKU_TAKEN");
      }
    }

    const at = now();
    applyProductUpdate(product, {
      name,
      description,
      sku,
      barcode,
      categoryId,
      price,
      ...(cost !== undefined ? { cost } : {}),
      now: at,
    });
    await deps.products.update(product);

    const event = productUpdatedEvent({
      productId: product.id,
      merchantId: product.merchantId,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      priceAmountMinor: product.price.amountMinor.toString(),
      categoryId: product.categoryId,
      previousBarcode,
      occurredAt: at,
    });

    return {
      product,
      event,
      priceDisplayToman: formatTomanDisplay(product.price),
    };
  }

  async function updateCategoryById(
    input: UpdateCategoryInput,
  ): Promise<UpdateCategoryResult> {
    const merchantId = input.merchantId.trim();
    const category = await deps.categories.findById(input.categoryId);
    if (!category || category.merchantId !== merchantId) {
      throw new CatalogDomainError("CATEGORY_NOT_FOUND");
    }
    if (category.deletedAt !== null) {
      throw new CatalogDomainError("CATEGORY_ALREADY_DELETED");
    }
    const name = requireCategoryName(input.name);
    renameCategory(category, name, now());
    await deps.categories.update(category);
    return { category };
  }

  async function softDeleteCategoryById(
    input: SoftDeleteCategoryInput,
  ): Promise<SoftDeleteCategoryResult> {
    const merchantId = input.merchantId.trim();
    const category = await deps.categories.findById(input.categoryId);
    if (!category || category.merchantId !== merchantId) {
      throw new CatalogDomainError("CATEGORY_NOT_FOUND");
    }
    if (category.deletedAt !== null) {
      throw new CatalogDomainError("CATEGORY_ALREADY_DELETED");
    }
    softDeleteCategory(category, now());
    await deps.categories.update(category);
    return { category };
  }

  /**
   * POS barcode resolve — tenant-scoped, soft-delete excluded, digit-normalized.
   * ADR-050: cache-aside key TTL 300s around this port (Redis adapter later).
   */
  async function lookupByBarcode(
    input: LookupByBarcodeInput,
  ): Promise<LookupByBarcodeResult> {
    const merchantId = input.merchantId.trim();
    const barcode = normalizeBarcode(input.barcode);
    if (!barcode) {
      return { product: null };
    }

    const product = await deps.products.findByBarcode(merchantId, barcode);
    if (!product || product.deletedAt !== null) {
      return { product: null };
    }
    if (product.merchantId !== merchantId) {
      return { product: null };
    }
    return { product };
  }

  /**
   * Lightweight merchant-scoped name search (Persian UTF-8 contains after
   * trim + digit normalize). Fuzzy pg_trgm → ARD migration path.
   * Soft-deleted products excluded from default merchant/POS search.
   */
  async function searchByName(
    input: SearchByNameInput,
  ): Promise<SearchByNameResult> {
    const merchantId = input.merchantId.trim();
    const needle = normalizeSearchText(input.query);
    if (!needle) {
      return { products: [] };
    }

    const rawLimit = input.limit ?? SEARCH_DEFAULT_LIMIT;
    const limit = Math.min(
      SEARCH_MAX_LIMIT,
      Math.max(1, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : SEARCH_DEFAULT_LIMIT),
    );

    const listed = await deps.products.listByMerchantId(merchantId);
    const products = listed
      .filter(
        (p) =>
          p.deletedAt === null &&
          normalizeSearchText(p.name).includes(needle),
      )
      .slice(0, limit);

    return { products };
  }

  async function uploadProductImage(input: {
    merchantId: string;
    productId: string;
    body: Uint8Array;
    contentType: string;
    filename?: string;
  }): Promise<{ product: Product; objectKey: string }> {
    const merchantId = input.merchantId.trim();
    const product = await deps.products.findById(input.productId);
    if (!product || product.merchantId !== merchantId) {
      throw new CatalogDomainError("PRODUCT_NOT_FOUND");
    }
    if (product.deletedAt !== null) {
      throw new CatalogDomainError("PRODUCT_ALREADY_DELETED");
    }

    if (!deps.objectStorage) {
      throw new CatalogDomainError("OBJECT_STORAGE_NOT_CONFIGURED");
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_TYPES.includes(input.contentType.toLowerCase())) {
      throw new CatalogDomainError("INVALID_IMAGE_TYPE");
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (input.body.length > MAX_SIZE) {
      throw new CatalogDomainError("IMAGE_TOO_LARGE");
    }

    const ext =
      input.contentType === "image/png"
        ? "png"
        : input.contentType === "image/webp"
          ? "webp"
          : input.contentType === "image/gif"
            ? "gif"
            : "jpg";
    const filename = input.filename?.trim() || `product-${product.id}-primary.${ext}`;
    const objectKey = buildObjectKey({
      merchantId,
      storeId: "catalog",
      kind: MINIO_BUCKETS.media,
      filename: filename.replace(/[/\\]/g, "_"),
    });

    await putValidatedObject(deps.objectStorage, {
      bucket: MINIO_BUCKETS.media,
      objectKey,
      body: input.body,
      contentType: input.contentType,
    });

    const at = now();
    product.imageObjectKey = objectKey;
    product.imageUpdatedAt = at;
    product.updatedAt = at;
    await deps.products.update(product);

    return { product, objectKey };
  }

  async function deleteProductImage(input: {
    merchantId: string;
    productId: string;
  }): Promise<{ product: Product }> {
    const merchantId = input.merchantId.trim();
    const product = await deps.products.findById(input.productId);
    if (!product || product.merchantId !== merchantId) {
      throw new CatalogDomainError("PRODUCT_NOT_FOUND");
    }
    if (product.deletedAt !== null) {
      throw new CatalogDomainError("PRODUCT_ALREADY_DELETED");
    }

    if (product.imageObjectKey && deps.objectStorage) {
      try {
        await deps.objectStorage.deleteObject({
          bucket: MINIO_BUCKETS.media,
          objectKey: product.imageObjectKey,
        });
      } catch {
        // Best-effort delete object from MinIO
      }
    }

    const at = now();
    product.imageObjectKey = null;
    product.imageUpdatedAt = at;
    product.updatedAt = at;
    await deps.products.update(product);

    return { product };
  }

  return {
    createCategory,
    createProduct,
    updateProduct,
    softDeleteProductById,
    updateCategoryById,
    softDeleteCategoryById,
    lookupByBarcode,
    searchByName,
    uploadProductImage,
    deleteProductImage,
  };
}

export type CatalogUseCases = ReturnType<typeof createCatalogUseCases>;
