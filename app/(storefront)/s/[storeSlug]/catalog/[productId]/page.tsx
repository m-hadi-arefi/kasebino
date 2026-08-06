import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { StorefrontChrome } from "@/components/layout/storefront-chrome";
import { Button } from "@/components/ui/button";
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
  const store = profile.store;

  return (
    <StorefrontChrome
      storeSlug={storeSlug}
      storeName={store.branding.displayName}
      primaryColor={store.branding.primaryColor}
      mode="public"
    >
      <div className="flex flex-col gap-6 pb-4">
        <PageHeader
          title={product.name}
          description={
            product.inStock
              ? `${fa.availableQty}: ${product.availableQuantity} · ${product.priceDisplayToman}`
              : `${fa.outOfStock} · ${product.priceDisplayToman}`
          }
          breadcrumbs={[
            { label: fa.backCatalog, href: `${base}/catalog` },
            { label: product.name },
          ]}
        />

        {product.description ? (
          <p className="leading-7 text-foreground">{product.description}</p>
        ) : null}

        <p className="text-sm text-muted-foreground">{fa.fulfillmentLabel}</p>

        <div className="sticky bottom-4 z-10 space-y-3 rounded-lg border border-border bg-card/95 p-4 shadow-md backdrop-blur">
          <AddToCartButton storeSlug={storeSlug} product={product} />
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href={`${base}/checkout`}>{fa.checkoutNav}</Link>
          </Button>
        </div>
      </div>
    </StorefrontChrome>
  );
}
