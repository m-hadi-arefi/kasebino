import type { Metadata } from "next";
import Link from "next/link";

type OrdersPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: OrdersPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `سفارش‌های من «${storeSlug}» | کاسبینو`,
    description: "تاریخچهٔ سفارش‌های پیکاپ همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardOrdersPage({
  params,
}: OrdersPageProps) {
  const { storeSlug } = await params;
  const base = `/s/${encodeURIComponent(storeSlug)}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href={`${base}/dashboard`}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          پنل من
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          سفارش‌های من
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          مبالغ به تومان · تاریخ‌ها به تقویم شمسی (تهران)
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          سفارش‌های آنلاین فقط به‌صورت حضوری (پیکاپ) هستند.
        </p>
      </header>

      <section
        aria-live="polite"
        className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-[var(--color-muted)]"
      >
        <p>هنوز سفارشی ندارید.</p>
        <p className="mt-2 text-sm">برای مشاهدهٔ سفارش‌ها وارد شوید.</p>
      </section>
    </main>
  );
}
