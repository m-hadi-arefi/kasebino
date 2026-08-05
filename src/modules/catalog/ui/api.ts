/**
 * ADR-097 merchant catalog / inventory HTTP client (session cookies).
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";

export type CatalogProductDto = {
  id: string;
  merchantId: string;
  name: string;
  description: string | null;
  sku: string;
  barcode: string;
  categoryId: string | null;
  priceAmountMinor: string;
  priceDisplayToman: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogCategoryDto = {
  id: string;
  merchantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogStockItemDto = {
  id: string;
  merchantId: string;
  storeId: string;
  productId: string;
  quantity: number;
  version: number;
  reorderLevel: number;
  updatedAt: string;
};

export type CatalogStoreDto = {
  id: string;
  merchantId: string;
  displayName: string;
  slug: string;
};

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string };
};

async function parseJson<T>(res: Response): Promise<Envelope<T>> {
  return (await res.json()) as Envelope<T>;
}

function errorMessage(body: Envelope<unknown>, fallback: string): string {
  const err = body.error as
    | { code?: string; message?: string; messageFa?: string }
    | undefined;
  return err?.messageFa ?? err?.message ?? fallback;
}

export async function fetchMerchantStores(): Promise<CatalogStoreDto[]> {
  const res = await fetch("/api/v1/stores", { credentials: "same-origin" });
  const body = await parseJson<{ stores: CatalogStoreDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "stores_failed"));
  return body.data?.stores ?? [];
}

export async function fetchProducts(query?: string): Promise<CatalogProductDto[]> {
  const url =
    query && query.trim()
      ? `/api/v1/catalog/products?q=${encodeURIComponent(query.trim())}`
      : "/api/v1/catalog/products";
  const res = await fetch(url, { credentials: "same-origin" });
  const body = await parseJson<{ products: CatalogProductDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "products_failed"));
  return body.data?.products ?? [];
}

export async function fetchProduct(id: string): Promise<CatalogProductDto> {
  const res = await fetch(`/api/v1/catalog/products/${id}`, {
    credentials: "same-origin",
  });
  const body = await parseJson<{ product: CatalogProductDto }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "product_failed"));
  if (!body.data?.product) throw new Error("product_failed");
  return body.data.product;
}

export type UpsertProductInput = {
  name: string;
  sku: string;
  barcode: string;
  priceAmountMinor: string;
  description?: string | null;
  categoryId?: string | null;
};

export async function createProduct(
  input: UpsertProductInput,
): Promise<CatalogProductDto> {
  const res = await fetch("/api/v1/catalog/products", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ product: CatalogProductDto }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "create_failed"));
  if (!body.data?.product) throw new Error("create_failed");
  return body.data.product;
}

export async function updateProduct(
  id: string,
  input: UpsertProductInput,
): Promise<CatalogProductDto> {
  const res = await fetch(`/api/v1/catalog/products/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ product: CatalogProductDto }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "update_failed"));
  if (!body.data?.product) throw new Error("update_failed");
  return body.data.product;
}

export async function softDeleteProduct(id: string): Promise<void> {
  const res = await fetch(`/api/v1/catalog/products/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: {
      ...csrfHeadersForBrowserFetch(),
    },
  });
  const body = await parseJson<unknown>(res);
  if (!res.ok) throw new Error(errorMessage(body, "delete_failed"));
}

export async function fetchCategories(): Promise<CatalogCategoryDto[]> {
  const res = await fetch("/api/v1/catalog/categories", {
    credentials: "same-origin",
  });
  const body = await parseJson<{ categories: CatalogCategoryDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "categories_failed"));
  return body.data?.categories ?? [];
}

export async function createCategory(name: string): Promise<CatalogCategoryDto> {
  const res = await fetch("/api/v1/catalog/categories", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify({ name }),
  });
  const body = await parseJson<{ category: CatalogCategoryDto }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "category_create_failed"));
  if (!body.data?.category) throw new Error("category_create_failed");
  return body.data.category;
}

export async function softDeleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/v1/catalog/categories/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: {
      ...csrfHeadersForBrowserFetch(),
    },
  });
  const body = await parseJson<unknown>(res);
  if (!res.ok) throw new Error(errorMessage(body, "category_delete_failed"));
}

export async function fetchInventory(
  storeId: string,
): Promise<CatalogStockItemDto[]> {
  const res = await fetch(
    `/api/v1/inventory?storeId=${encodeURIComponent(storeId)}`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{ items: CatalogStockItemDto[] }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "inventory_failed"));
  return body.data?.items ?? [];
}

export async function adjustInventory(input: {
  storeId: string;
  productId: string;
  delta: number;
  reason?: string;
  createIfMissing?: boolean;
}): Promise<CatalogStockItemDto> {
  const res = await fetch("/api/v1/inventory/adjust", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeadersForBrowserFetch(),
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ item: CatalogStockItemDto }>(res);
  if (!res.ok) throw new Error(errorMessage(body, "adjust_failed"));
  if (!body.data?.item) throw new Error("adjust_failed");
  return body.data.item;
}
