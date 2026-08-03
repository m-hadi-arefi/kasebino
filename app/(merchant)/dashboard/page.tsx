import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "داشبورد فروشگاه | کاسبینو",
  description: "نبض حفظ مشتری — فروش، عضویت و بازگشت",
  robots: { index: false, follow: false },
};

const widgets = [
  {
    id: "overview",
    title: "نمای کلی",
    hint: "فروش و عضویت فعال",
    metric: "تعداد فروش · درآمد (تومان)",
  },
  {
    id: "revenue",
    title: "درآمد",
    hint: "جمع فروش در بازهٔ شمسی",
    metric: "مبالغ به تومان",
  },
  {
    id: "customers",
    title: "مشتریان",
    hint: "عضویت‌های فعال و جدید",
    metric: "عضویت‌های مغازه",
  },
  {
    id: "retention",
    title: "بازماندگی",
    hint: "مشتریان بازمانده ماهانه",
    metric: "شمال‌ستارهٔ حفظ مشتری",
  },
] as const;

export default function MerchantDashboardPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          داشبورد فروشگاه
        </h1>
        <p className="text-[var(--color-muted)]">
          نبض حفظ مشتری — فروش، عضویت و بازگشت
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
          برای مشاهدهٔ داشبورد وارد شوید.
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          ورود با پیامک برای صاحب مغازه و کارکنان
        </p>
      </section>

      <section aria-label="ویجت‌های نمای کلی" className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-[var(--color-fg)]">نمای کلی</h2>
        <p className="text-sm text-[var(--color-muted)]">
          داده از analytics OLTP (به‌زودی) · به‌روزرسانی کش تقریباً هر ۶۰ ثانیه
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
                هنوز داده‌ای برای نمایش نیست.
              </p>
            </li>
          ))}
        </ul>
      </section>

      <nav
        aria-label="ناوبری داشبورد فروشنده"
        className="flex flex-wrap gap-3 text-base"
      >
        <Link
          href="/pos"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          صندوق فروش
        </Link>
      </nav>

      <p className="text-sm text-[var(--color-muted)]">
        این داشبورد فقط برای فروشنده است. فقط پیکاپ حضوری — بدون ارسال/پیک
      </p>
    </main>
  );
}
