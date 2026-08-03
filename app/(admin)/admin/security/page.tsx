import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "سیگنال‌های امنیتی | مدیریت پلتفرم",
  description: "هشدارهای سوءاستفاده و اعتماد پلتفرم",
  robots: { index: false, follow: false },
};

export default function AdminSecurityPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          سیگنال‌های امنیتی
        </h1>
        <p className="text-[var(--color-muted)]">
          هشدارهای سوءاستفاده و اعتماد پلتفرم
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          مشاهدهٔ این صفحه ثبت و ممیزی می‌شود · تقویم شمسی (تهران)
        </p>
      </header>

      <section
        aria-live="polite"
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5"
      >
        <p className="font-medium text-[var(--color-fg)]">
          این بخش فقط برای مدیران پلتفرم است. دسترسی کارکنان فروشگاه مجاز نیست.
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          هنوز سیگنال امنیتی برای نمایش نیست.
        </p>
      </section>

      <section
        aria-label="نمونه‌های هشدار"
        className="flex flex-col gap-3 text-sm text-[var(--color-muted)]"
      >
        <p>احراز هویت مشکوک · اوج محدودیت نرخ · تعلیق‌ها (به‌زودی)</p>
      </section>

      <nav aria-label="ناوبری امنیت" className="flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          خانه
        </Link>
        <Link
          href="/admin/merchants"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          فهرست فروشندگان
        </Link>
      </nav>
    </main>
  );
}
