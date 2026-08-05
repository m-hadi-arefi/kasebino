import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
          href={base}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {fa.backHome}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.catalogTitle}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">{fa.catalogSubtitle}</p>
      </header>

      {products.length === 0 ? (
        <section
          aria-live="polite"
          className="border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-[var(--color-muted)]"
        >
          <p>{fa.emptyCatalog}</p>
        </section>
      ) : (
        <ul className="flex flex-col" aria-label={fa.catalogTitle}>
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`${base}/catalog/${encodeURIComponent(product.id)}`}
                className="flex min-h-11 flex-col gap-1 border-b border-[var(--color-border)] py-3"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--color-fg)]">
                    {product.name}
                  </span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {product.priceDisplayToman}
                  </span>
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  {product.inStock
                    ? `${fa.availableQty}: ${product.availableQuantity}`
                    : fa.outOfStock}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`${base}/checkout`}
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5"
      >
        {fa.checkoutNav}
      </Link>
    </main>
  );
}
