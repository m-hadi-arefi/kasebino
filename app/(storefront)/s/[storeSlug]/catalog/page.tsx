import type { Metadata } from "next";
import Link from "next/link";

/** Public storefront cache — ADR-086 (600s). */
export const revalidate = 600;

type CatalogPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: CatalogPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `کاتالوگ کالاها «${storeSlug}» | کاسبینو`,
    description: "کاتالوگ فروشگاه — سفارش فقط به‌صورت حضوری (پیکاپ)",
  };
}

export default async function StorefrontCatalogPage({ params }: CatalogPageProps) {
  const { storeSlug } = await params;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href={`/s/${encodeURIComponent(storeSlug)}`}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          خانه
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          کاتالوگ کالاها
        </h1>
        <p className="text-sm text-[var(--color-muted)]">قیمت‌ها به تومان</p>
      </header>

      <section
        aria-live="polite"
        className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-[var(--color-muted)]"
      >
        <p>هنوز کالایی ثبت نشده.</p>
      </section>
    </main>
  );
}
