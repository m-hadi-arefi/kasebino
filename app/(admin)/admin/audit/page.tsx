import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "گزارش حسابرسی | مدیریت پلتفرم",
  description: "مرور اقدامات حساس برای انطباق",
  robots: { index: false, follow: false },
};

export default function AdminAuditPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          گزارش حسابرسی
        </h1>
        <p className="text-[var(--color-muted)]">
          اقدامات حساس برای بررسی انطباق؛ فیلتر پذیرنده، بازیگر، و تاریخ شمسی در
          رابط ادمین.
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          مشاهدهٔ گزارش حسابرسی نیز ثبت می‌شود · بازهٔ تاریخ‌ها به تقویم شمسی
          (تهران)
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
          هنوز رویداد حسابرسی برای نمایش نیست.
        </p>
      </section>

      <section
        aria-label="فیلترهای حسابرسی"
        className="flex flex-col gap-2 text-sm text-[var(--color-muted)]"
      >
        <p>فیلترها (به‌زودی): فروشنده · بازیگر · اقدام · بازهٔ شمسی</p>
        <p>شماره موبایل در جزئیات حسابرسی حذف یا پوشانده می‌شود.</p>
      </section>

      <nav aria-label="ناوبری حسابرسی" className="flex flex-wrap gap-3">
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
