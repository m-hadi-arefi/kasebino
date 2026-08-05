import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { STOREFRONT_UI_COPY_FA } from "@/modules/storefront/ui";
import { loadStorefrontProduct } from "@/modules/storefront/ui/load";

import { AddToCartButton } from "../add-to-cart-button";

/** Public storefront cache — ADR-086 (600s). */
export const revalidate = 600;

const fa = STOREFRONT_UI_COPY_FA;

type ProductPageProps = {
  params: Promise<{ storeSlug: string; productId: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { storeSlug, productId } = await params;
  const data = await loadStorefrontProduct(storeSlug, productId);
  if (!data) {
    return { title: "کالا پیدا نشد | کاسبینو" };
  }
  return {
    title: `${data.product.name} | ${data.profile.store.branding.displayName}`,
    description: data.product.description ?? "جزئیات کالا — تحویل حضوری",
  };
}

export default async function StorefrontProductPage({
  params,
}: ProductPageProps) {
  const { storeSlug, productId } = await params;
  const data = await loadStorefrontProduct(storeSlug, productId);
  if (!data) notFound();

  const { product, profile } = data;
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const accent = profile.store.branding.primaryColor;
  const accentStyle = accent
    ? ({ ["--color-primary"]: accent } as CSSProperties)
    : undefined;

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6"
      style={accentStyle}
    >
      <header className="flex flex-col gap-2">
        <Link
          href={`${base}/catalog`}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {fa.backCatalog}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {product.name}
        </h1>
        <p className="text-lg font-medium text-[var(--color-fg)]">
          {product.priceDisplayToman}
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {product.inStock
            ? `${fa.availableQty}: ${product.availableQuantity}`
            : fa.outOfStock}
        </p>
      </header>

      {product.description ? (
        <p className="text-[var(--color-fg)] leading-7">{product.description}</p>
      ) : null}

      <p className="text-sm text-[var(--color-muted)]">{fa.fulfillmentLabel}</p>

      <AddToCartButton storeSlug={storeSlug} product={product} />

      <Link
        href={`${base}/checkout`}
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5"
      >
        {fa.checkoutNav}
      </Link>
    </main>
  );
}
