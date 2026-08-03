import type { Metadata } from "next";
import Link from "next/link";
import { StoreCustomerInstallPrompt } from "./install-prompt";

/** Public storefront cache — ADR-086 (600s). */
export const revalidate = 600;

type StorefrontPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  const manifestPath = `/s/${encodeURIComponent(storeSlug)}/manifest.webmanifest`;
  return {
    title: `ویترین فروشگاه «${storeSlug}» | کاسبینو`,
    description: "فروشگاه محلی — سفارش فقط به‌صورت حضوری (پیکاپ)",
    manifest: manifestPath,
    appleWebApp: {
      capable: true,
      title: storeSlug,
      statusBarStyle: "default",
    },
  };
}

export default async function StorefrontHomePage({ params }: StorefrontPageProps) {
  const { storeSlug } = await params;

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-[var(--color-muted)]">{storeSlug}</p>
          <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
            ویترین فروشگاه
          </h1>
          <p className="text-[var(--color-muted)]">
            سفارش فقط به‌صورت حضوری (پیکاپ) — بدون ارسال پیک
          </p>
        </header>

        <nav
          aria-label="ناوبری ویترین"
          className="flex flex-wrap gap-3 text-base"
        >
          <Link
            href={`/s/${encodeURIComponent(storeSlug)}/catalog`}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
          >
            کاتالوگ
          </Link>
          <Link
            href={`/s/${encodeURIComponent(storeSlug)}/about`}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
          >
            درباره
          </Link>
          <Link
            href={`/s/${encodeURIComponent(storeSlug)}/dashboard`}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
          >
            پنل من
          </Link>
        </nav>

        <section className="flex flex-col gap-3" aria-label="سفارش پیکاپ">
          <a
            href="#pickup"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-center font-medium text-[var(--color-primary-fg)]"
          >
            سفارش حضوری (پیکاپ)
          </a>
          <p id="pickup" className="text-sm text-[var(--color-muted)]">
            ارسال پیک یا پیک موتوری در دسترس نیست.
          </p>
        </section>
      </main>

      <StoreCustomerInstallPrompt storeSlug={storeSlug} displayName={storeSlug} />
    </>
  );
}
