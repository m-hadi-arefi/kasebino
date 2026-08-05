import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  const accent = store.branding.primaryColor;
  const accentStyle = accent
    ? ({ ["--color-primary"]: accent } as CSSProperties)
    : undefined;
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
      <main
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6"
        style={accentStyle}
      >
        <header className="flex flex-col gap-2">
          {store.branding.logoUrl || store.branding.logoObjectKey ? (
            <img
              src={
                store.branding.logoUrl ??
                `/api/v1/storefront/${encodeURIComponent(store.slug)}/logo`
              }
              alt=""
              className="h-14 w-14 rounded-[var(--radius-md)] object-cover"
              width={56}
              height={56}
            />
          ) : null}
          <p className="text-sm text-[var(--color-muted)]">{fa.homeEyebrow}</p>
          <h1 className="text-3xl font-semibold text-[var(--color-fg)]">
            {store.branding.displayName}
          </h1>
          <p className="text-[var(--color-muted)]">{fa.pickupOnlyBody}</p>
        </header>

        {fromQr ? (
          <QrAcquisitionBanner
            merchantId={data.profile.merchant.id}
            storeId={store.id}
          />
        ) : null}

        <nav
          aria-label="ناوبری ویترین"
          className="flex flex-wrap gap-3 text-base"
        >
          <Link
            href={`${base}/catalog`}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
          >
            {fa.catalogNav}
          </Link>
          <Link
            href={`${base}/about`}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
          >
            {fa.aboutNav}
          </Link>
          <Link
            href={`${base}/checkout`}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
          >
            {fa.checkoutNav}
          </Link>
          <Link
            href={`${base}/dashboard`}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
          >
            {fa.dashboardNav}
          </Link>
        </nav>

        <section className="flex flex-col gap-3" aria-label={fa.orderPickupCta}>
          <Link
            href={`${base}/checkout`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-center font-medium text-[var(--color-primary-fg)]"
          >
            {fa.orderPickupCta}
          </Link>
          <p className="text-sm text-[var(--color-muted)]">{fa.pickupRestrictionNote}</p>
        </section>

        <section aria-label={fa.catalogTitle} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{fa.catalogTitle}</h2>
            <Link
              href={`${base}/catalog`}
              className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              {fa.viewProduct}
            </Link>
          </div>
          {products.length === 0 ? (
            <p className="text-[var(--color-muted)]">{fa.emptyCatalog}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {products.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`${base}/catalog/${encodeURIComponent(product.id)}`}
                    className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--color-border)] py-3"
                  >
                    <span className="font-medium text-[var(--color-fg)]">
                      {product.name}
                    </span>
                    <span className="text-sm text-[var(--color-muted)]">
                      {product.priceDisplayToman}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <StoreCustomerInstallPrompt
        storeSlug={storeSlug}
        displayName={store.branding.displayName}
      />
    </>
  );
}
