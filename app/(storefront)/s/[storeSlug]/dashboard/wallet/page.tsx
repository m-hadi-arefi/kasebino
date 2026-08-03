import type { Metadata } from "next";
import Link from "next/link";

type WalletPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: WalletPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `کیف امتیاز «${storeSlug}» | کاسبینو`,
    description: "موجودی امتیاز وفاداری عضویت همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardWalletPage({
  params,
}: WalletPageProps) {
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
          کیف امتیاز
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          مبالغ به تومان · تاریخ‌ها به تقویم شمسی (تهران)
        </p>
      </header>

      <section
        aria-live="polite"
        className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-[var(--color-muted)]"
      >
        <p>هنوز امتیازی ندارید.</p>
        <p className="mt-2 text-sm">برای مشاهدهٔ کیف امتیاز وارد شوید.</p>
      </section>

      <p className="text-sm text-[var(--color-muted)]">
        فقط اطلاعات عضویت همین مغازه نمایش داده می‌شود.
      </p>
    </main>
  );
}
