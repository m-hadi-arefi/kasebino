import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/composites/empty-state";
import { StorefrontChrome } from "@/components/layout/storefront-chrome";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasQrAcquisitionSource } from "@/qr-acquisition";
import { STOREFRONT_UI_COPY_FA } from "@/modules/storefront/ui";
import { loadStorefrontCatalog } from "@/modules/storefront/ui/load";
import { StoreCustomerInstallPrompt } from "./install-prompt";
import { QrAcquisitionBanner } from "./qr-acquisition-banner";

/** Public storefront cache — ADR-086 (600s). */
export const revalidate = 600;

const fa = STOREFRONT_UI_COPY_FA;

type StorefrontPageProps = {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  const data = await loadStorefrontCatalog(storeSlug);
  const name = data?.profile.store.branding.displayName ?? storeSlug;
  const manifestPath = `/s/${encodeURIComponent(storeSlug)}/manifest.webmanifest`;
  return {
    title: `${name} | کاسبینو`,
    description: "فروشگاه محلی — سفارش فقط به‌صورت حضوری (پیکاپ)",
    manifest: manifestPath,
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: "default",
    },
  };
}

export default async function StorefrontHomePage({
  params,
  searchParams,
}: StorefrontPageProps) {
  const { storeSlug } = await params;
  const query = await searchParams;
  const data = await loadStorefrontCatalog(storeSlug);
  if (!data) notFound();

  const store = data.profile.store;
  const products = data.products.slice(0, 6);
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const srcRaw = query.src;
  const src =
    typeof srcRaw === "string"
      ? srcRaw
      : Array.isArray(srcRaw)
        ? srcRaw[0]
        : undefined;
  const fromQr = hasQrAcquisitionSource(
    src ? new URLSearchParams({ src }) : "",
  );

  return (
    <>
      <StorefrontChrome
        storeSlug={storeSlug}
        storeName={store.branding.displayName}
        primaryColor={store.branding.primaryColor}
        mode="public"
      >
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            {store.branding.logoUrl || store.branding.logoObjectKey ? (
              <img
                src={
                  store.branding.logoUrl ??
                  `/api/v1/storefront/${encodeURIComponent(store.slug)}/logo`
                }
                alt=""
                className="size-14 rounded-md object-cover"
                width={56}
                height={56}
              />
            ) : null}
            <p className="text-sm text-muted-foreground">{fa.homeEyebrow}</p>
            <h1 className="text-3xl font-semibold text-foreground">
              {store.branding.displayName}
            </h1>
            <p className="text-muted-foreground">{fa.pickupOnlyBody}</p>
          </header>

          {fromQr ? (
            <QrAcquisitionBanner
              merchantId={data.profile.merchant.id}
              storeId={store.id}
            />
          ) : null}

          <nav
            aria-label="ناوبری ویترین"
            className="flex flex-wrap gap-2"
          >
            <Button asChild variant="secondary" className="min-h-11">
              <Link href={`${base}/catalog`}>{fa.catalogNav}</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`${base}/about`}>{fa.aboutNav}</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`${base}/checkout`}>{fa.checkoutNav}</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`${base}/dashboard`}>{fa.dashboardNav}</Link>
            </Button>
          </nav>

          <section className="flex flex-col gap-3" aria-label={fa.orderPickupCta}>
            <div className="sticky bottom-4 z-10">
              <Button asChild size="lg" className="min-h-11 w-full">
                <Link href={`${base}/checkout`}>{fa.orderPickupCta}</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {fa.pickupRestrictionNote}
            </p>
          </section>

          <section aria-label={fa.catalogTitle} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{fa.catalogTitle}</h2>
              <Button asChild variant="link" className="h-auto p-0">
                <Link href={`${base}/catalog`}>{fa.viewProduct}</Link>
              </Button>
            </div>
            {products.length === 0 ? (
              <EmptyState title={fa.emptyCatalog} />
            ) : (
              <ul className="grid gap-3">
                {products.map((product) => (
                  <li key={product.id}>
                    <Card className="transition-shadow hover:shadow-md">
                      <Link
                        href={`${base}/catalog/${encodeURIComponent(product.id)}`}
                        className="block"
                      >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-base font-medium">
                            {product.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {product.priceDisplayToman}
                          </CardDescription>
                        </CardHeader>
                      </Link>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </StorefrontChrome>

      <StoreCustomerInstallPrompt
        storeSlug={storeSlug}
        displayName={store.branding.displayName}
      />
    </>
  );
}
