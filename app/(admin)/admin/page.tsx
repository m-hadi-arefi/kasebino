import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "مدیریت پلتفرم | کاسبینو",
  description: "پورتفolio فروشندگان، امنیت و حسابرسی",
  robots: { index: false, follow: false },
};

const widgets = [
  {
    id: "overview",
    title: "نمای کلی پلتفرم",
    hint: "فعال‌سازی و تعامل فروشندگان",
    metric: "DAM · MAM · GMV پروکسی (تومان)",
  },
  {
    id: "activation",
    title: "فعال‌سازی فروشندگان",
    hint: "ثبت‌نام تا اولین فروش",
    metric: "نرخ فعال‌سازی",
  },
  {
    id: "engagement",
    title: "تعامل فروشندگان",
    hint: "نشست‌های صندوق در بازهٔ شمسی",
    metric: "فروشندگان فعال روزانه",
  },
  {
    id: "trust",
    title: "اعتماد و ایمنی",
    hint: "تعلیق‌ها و هشدارهای مشکوک",
    metric: "سیگنال‌های امنیتی",
  },
] as const;

export default function AdminHomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          مدیریت پلتفرم
        </h1>
        <p className="text-[var(--color-muted)]">
          پورتفolio فروشندگان، امنیت و حسابرسی
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          مبالغ به تومان · بازهٔ تاریخ‌ها به تقویم شمسی (تهران)
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
          برای ورود به پنل مدیریت وارد شوید. همه اقدامات مدیریتی ثبت و ممیزی
          می‌شوند.
        </p>
      </section>

      <section aria-label="ویجت‌های پورتفolio" className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-[var(--color-fg)]">
          نمای کلی پلتفرم
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          داده از analytics مدیریتی (به‌زودی) · مبالغ GMV پروکسی؛ تطبیق مالی با
          PostgreSQL · فهرست فروشندگان کش کوتاه (~۳۰ث)
        </p>
        <ul className="flex flex-col gap-3">
          {widgets.map((widget) => (
            <li
              key={widget.id}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <p className="font-medium text-[var(--color-fg)]">{widget.title}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {widget.hint}
              </p>
              <p className="mt-2 text-sm text-[var(--color-fg)]">
                {widget.metric}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                هنوز دادهٔ مدیریتی برای نمایش نیست.
              </p>
            </li>
          ))}
        </ul>
      </section>

      <nav
        aria-label="ناوبری پنل مدیریت"
        className="flex flex-wrap gap-3 text-base"
      >
        <Link
          href="/admin/merchants"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          فهرست فروشندگان
        </Link>
        <Link
          href="/admin/security"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          امنیت
        </Link>
        <Link
          href="/admin/audit"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          حسابرسی
        </Link>
      </nav>

      <p className="text-sm text-[var(--color-muted)]">
        مشاهدهٔ این صفحه نیز ثبت می‌شود. فقط پیکاپ حضوری — بدون ارسال/پیک در
        دامنه‌های تجاری
      </p>
    </main>
  );
}
