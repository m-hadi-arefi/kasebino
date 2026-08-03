import type { Metadata } from "next";
import Link from "next/link";

type DashboardPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: DashboardPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `پنل من «${storeSlug}» | کاسبینو`,
    description: "امتیاز، سفارش‌ها و رسیدهای عضویت همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardHomePage({
  params,
}: DashboardPageProps) {
  const { storeSlug } = await params;
  const base = `/s/${encodeURIComponent(storeSlug)}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href={base}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          بازگشت به ویترین
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">پنل من</h1>
        <p className="text-[var(--color-muted)]">
          امتیاز، سفارش‌ها و رسیدهای همین فروشگاه
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          مبالغ به تومان · تاریخ‌ها به تقویم شمسی (تهران)
        </p>
      </header>

      <section
        aria-live="polite"
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5"
      >
        <p className="font-medium text-[var(--color-fg)]">
          برای مشاهدهٔ پنل وارد شوید.
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          ورود با پیامک برای اعضای همین فروشگاه
        </p>
      </section>

      <nav
        aria-label="ناوبری پنل مشتری"
        className="flex flex-wrap gap-3 text-base"
      >
        <Link
          href={`${base}/dashboard/orders`}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          سفارش‌ها
        </Link>
        <Link
          href={`${base}/dashboard/wallet`}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          کیف امتیاز
        </Link>
      </nav>

      <p className="text-sm text-[var(--color-muted)]">
        فقط اطلاعات عضویت همین مغازه نمایش داده می‌شود.
      </p>
    </main>
  );
}
