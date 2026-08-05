import type { Metadata } from "next";
import Link from "next/link";

import { AdminProviders } from "../admin-providers";
import { AdminMerchantsClient } from "./admin-merchants-client";

export const metadata: Metadata = {
  title: "فهرست فروشندگان | مدیریت پلتفرم",
  description: "مشاهده، فعال‌سازی و تعلیق فروشندگان",
  robots: { index: false, follow: false },
};

export default function AdminMerchantsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          فهرست فروشندگان
        </h1>
        <p className="text-[var(--color-muted)]">
          مشاهده، فعال‌سازی و تعلیق فروشندگان
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          همه اقدامات مدیریتی ثبت و ممیزی می‌شوند · تقویم شمسی (تهران)
        </p>
      </header>

      <section
        aria-live="polite"
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5"
      >
        <p className="font-medium text-[var(--color-fg)]">
          این بخش فقط برای مدیران پلتفرم است. دسترسی کارکنان فروشگاه مجاز نیست.
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          تعلیق فروشنده دسترسی به صندوق و ویترین را قطع می‌کند. با دقت اقدام
          کنید.
        </p>
      </section>

      <AdminProviders>
        <AdminMerchantsClient />
      </AdminProviders>

      <p className="text-sm text-[var(--color-muted)]">
        هنوز فروشنده‌ای ثبت نشده ممکن است در فهرست خالی بماند تا API داده
        برگرداند.
      </p>

      <nav aria-label="بازگشت به خانه مدیریت" className="flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          خانه
        </Link>
        <Link
          href="/admin/audit"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          گزارش حسابرسی
        </Link>
      </nav>
    </main>
  );
}
