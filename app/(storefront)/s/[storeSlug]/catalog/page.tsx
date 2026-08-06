import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/composites/empty-state";
import { PageHeader } from "@/components/composites/page-header";
import { StorefrontChrome } from "@/components/layout/storefront-chrome";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STOREFRONT_UI_COPY_FA } from "@/modules/storefront/ui";
import { loadStorefrontCatalog } from "@/modules/storefront/ui/load";

/** Public storefront cache — ADR-086 (600s). */
export const revalidate = 600;

const fa = STOREFRONT_UI_COPY_FA;

type CatalogPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: CatalogPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  const data = await loadStorefrontCatalog(storeSlug);
  const name = data?.profile.store.branding.displayName ?? storeSlug;
  return {
    title: `کاتالوگ «${name}» | کاسبینو`,
    description: "کاتالوگ فروشگاه — سفارش فقط به‌صورت حضوری (پیکاپ)",
  };
}

export default async function StorefrontCatalogPage({ params }: CatalogPageProps) {
  const { storeSlug } = await params;
  const data = await loadStorefrontCatalog(storeSlug);
  if (!data) notFound();

  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const { products, profile } = data;
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
          title={fa.catalogTitle}
          description={fa.catalogSubtitle}
          breadcrumbs={[
            { label: fa.backHome, href: base },
            { label: fa.catalogTitle },
          ]}
        />

        {products.length === 0 ? (
          <EmptyState title={fa.emptyCatalog} />
        ) : (
          <ul className="grid gap-3" aria-label={fa.catalogTitle}>
            {products.map((product) => (
              <li key={product.id}>
                <Card className="transition-shadow hover:shadow-md">
                  <Link
                    href={`${base}/catalog/${encodeURIComponent(product.id)}`}
                    className="block"
                  >
                    <CardHeader className="gap-1">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {product.priceDisplayToman}
                        </span>
                      </div>
                      <CardDescription>
                        {product.inStock
                          ? `${fa.availableQty}: ${product.availableQuantity}`
                          : fa.outOfStock}
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <div className="sticky bottom-4 z-10 pt-2">
          <Button asChild className="min-h-11 w-full">
            <Link href={`${base}/checkout`}>{fa.checkoutNav}</Link>
          </Button>
        </div>
      </div>
    </StorefrontChrome>
  );
}
