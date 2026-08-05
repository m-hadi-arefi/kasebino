import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { OrdersBoardClient } from "./orders-board-client";
import { OrdersProviders } from "./orders-providers";

export const metadata: Metadata = {
  title: "تابلوی سفارش‌های پیکاپ | کاسبینو",
  description: "آماده‌سازی و تحویل حضوری سفارش‌های ویترین",
  robots: { index: false, follow: false },
};

export default async function MerchantOrdersPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/orders");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          تابلوی سفارش‌های پیکاپ
        </h1>
        <p className="text-[var(--color-muted)]">
          تحویل حضوری — آماده‌سازی و تحویل به مشتری
        </p>
      </header>
      <OrdersProviders>
        <OrdersBoardClient />
      </OrdersProviders>
    </main>
  );
}
