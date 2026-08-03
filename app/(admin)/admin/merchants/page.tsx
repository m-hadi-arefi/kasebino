import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "فهرست فروشندگان | مدیریت پلتفرم",
  description: "مشاهده، فعال‌سازی و تعلیق فروشندگان",
  robots: { index: false, follow: false },
};

const sampleRows = [
  {
    id: "m-demo-1",
    name: "مغازهٔ نمونه — کرمان",
    status: "فعال",
  },
  {
    id: "m-demo-2",
    name: "پیش‌نویس آزمایشی",
    status: "پیش‌نویس",
  },
] as const;

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

      <section aria-label="جدول فروشندگان" className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-[var(--color-fg)]">
          فروشندگان
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          داده از API مدیریت (به‌زودی) · کش فهرست حدود ۳۰ ثانیه
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  نام
                </th>
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  وضعیت
                </th>
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  اقدامات
                </th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-[var(--color-muted)]"
                  >
                    هنوز فروشنده‌ای ثبت نشده.
                  </td>
                </tr>
              ) : (
                sampleRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)]"
                  >
                    <td className="px-3 py-3 text-[var(--color-fg)]">
                      {row.name}
                    </td>
                    <td className="px-3 py-3 text-[var(--color-muted)]">
                      {row.status}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-fg)]"
                          title="با فعال‌سازی، فروشنده می‌تواند از صندوق و ویترین استفاده کند."
                        >
                          فعال‌سازی فروشنده
                        </button>
                        <button
                          type="button"
                          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-fg)]"
                          title="با تعلیق، صندوق و ویترین این فروشنده غیرفعال می‌شوند."
                        >
                          تعلیق فروشنده
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-[var(--color-muted)]">
          هنوز فروشنده‌ای ثبت نشده — ردیف‌های بالا فقط نمونهٔ رابط هستند.
        </p>
      </section>

      <nav aria-label="بازگشت به خانه مدیریت" className="flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          خانه
        </Link>
      </nav>
    </main>
  );
}
