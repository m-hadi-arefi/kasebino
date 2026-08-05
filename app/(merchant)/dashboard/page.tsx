import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  isMerchantSession,
  merchantIdFromSession,
} from "@/infrastructure/auth/session-guard";
import { getApiContext } from "@/infrastructure/composition";

import { StoreSwitcher } from "../stores/store-switcher";
import { DashboardAnalyticsWidgets } from "./dashboard-analytics-widgets";
import { DashboardCustomersWidget } from "./dashboard-customers-widget";
import { DashboardProviders } from "./dashboard-providers";

export const metadata: Metadata = {
  title: "داشبورد فروشگاه | کاسبینو",
  description: "نبض حفظ مشتری — فروش، عضویت و بازگشت",
  robots: { index: false, follow: false },
};

export default async function MerchantDashboardPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const ctx = getApiContext();
  const userId = session?.user?.id;
  let merchantId = merchantIdFromSession(session);
  if (!merchantId && typeof userId === "string") {
    const owned = await ctx.repos.merchants.findByOwnerUserId(userId);
    merchantId = owned?.id ?? null;
  }
  if (!merchantId) {
    redirect("/onboarding");
  }
  const stores = await ctx.repos.stores.listByMerchantId(merchantId);
  if (stores.length === 0) {
    redirect("/onboarding");
  }

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
          مبالغ به تومان · بازهٔ تاریخ‌ها به تقویم شمسی (تهران) · کش حدود ۶۰
          ثانیه · درآمد، مشتریان و بازماندگی زنده از analytics
        </p>
      </header>

      <StoreSwitcher />

      <section
        aria-live="polite"
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5"
      >
        <p className="font-medium text-[var(--color-fg)]">ورود موفق</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          شناسه: {session?.user?.id ?? "—"} · نسخهٔ توکن:{" "}
          {session?.tokenVersion ?? session?.user?.tokenVersion ?? 0}
        </p>
      </section>

      <section aria-label="ویجت‌های نمای کلی" className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-[var(--color-fg)]">نمای کلی</h2>
        <DashboardProviders>
          <ul className="flex flex-col gap-3">
            <DashboardAnalyticsWidgets />
            <DashboardCustomersWidget />
          </ul>
        </DashboardProviders>
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
        <Link
          href="/customers"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          مشتریان
        </Link>
        <Link
          href="/products"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          کالاها
        </Link>
        <Link
          href="/inventory"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          موجودی
        </Link>
        <Link
          href="/loyalty"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          باشگاه مشتریان
        </Link>
        <Link
          href="/orders"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          سفارش‌های پیکاپ
        </Link>
        <Link
          href="/notifications"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          اعلان‌ها
        </Link>
        <Link
          href="/stores"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          فروشگاه‌ها
        </Link>
        <Link
          href="/onboarding"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          راه‌اندازی
        </Link>
      </nav>

      <p className="text-sm text-[var(--color-muted)]">
        این داشبورد فقط برای فروشنده است. فقط پیکاپ حضوری — بدون ارسال/پیک
      </p>
    </main>
  );
}
