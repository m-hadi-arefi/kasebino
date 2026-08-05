/**
 * ADR-100 — server loaders for public storefront RSC pages.
 */

import { getApiContext } from "../../../infrastructure/composition/index.js";
import {
  publicProductDto,
  publicStoreDto,
} from "../../../infrastructure/http/dtos.js";
import type { PublicProductDto, PublicStoreDto } from "./api.js";

export type LoadedStorefrontProfile = {
  store: PublicStoreDto;
  merchant: { id: string; tradeName: string; slug: string };
};

export async function loadStorefrontProfile(
  slug: string,
): Promise<LoadedStorefrontProfile | null> {
  const ctx = getApiContext();
  const store = await ctx.repos.stores.findBySlug(slug);
  if (!store || store.status !== "active") return null;
  const merchant = await ctx.repos.merchants.findById(store.merchantId);
  if (!merchant || merchant.status !== "active") return null;
  return {
    store: publicStoreDto(store) as PublicStoreDto,
    merchant: {
      id: merchant.id,
      tradeName: merchant.tradeName,
      slug: merchant.slug,
    },
  };
}

export async function loadStorefrontCatalog(slug: string): Promise<{
  profile: LoadedStorefrontProfile;
  products: PublicProductDto[];
} | null> {
  const profile = await loadStorefrontProfile(slug);
  if (!profile) return null;
  const ctx = getApiContext();
  const store = await ctx.repos.stores.findBySlug(slug);
  if (!store) return null;
  const products = await ctx.repos.products.listByMerchantId(store.merchantId);
  const stockItems = await ctx.repos.stockItems.listByStore(
    store.merchantId,
    store.id,
  );
  const stockByProduct = new Map(
    stockItems.map((item) => [item.productId, item] as const),
  );
  const active = products.filter((p) => p.deletedAt === null);
  return {
    profile,
    products: active.map(
      (product) =>
        publicProductDto(
          product,
          stockByProduct.get(product.id) ?? null,
        ) as PublicProductDto,
    ),
  };
}

export async function loadStorefrontProduct(
  slug: string,
  productId: string,
): Promise<{
  profile: LoadedStorefrontProfile;
  product: PublicProductDto;
} | null> {
  const profile = await loadStorefrontProfile(slug);
  if (!profile) return null;
  const ctx = getApiContext();
  const store = await ctx.repos.stores.findBySlug(slug);
  if (!store) return null;
  const product = await ctx.repos.products.findById(productId);
  if (
    !product ||
    product.deletedAt !== null ||
    product.merchantId !== store.merchantId
  ) {
    return null;
  }
  const stock = await ctx.repos.stockItems.findByStoreProduct(
    store.merchantId,
    store.id,
    product.id,
  );
  return {
    profile,
    product: publicProductDto(product, stock) as PublicProductDto,
  };
}
