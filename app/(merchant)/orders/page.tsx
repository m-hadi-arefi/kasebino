import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تابلوی سفارش‌های پیکاپ"
        description="تحویل حضوری — آماده‌سازی و تحویل به مشتری"
      />
      <OrdersProviders>
        <OrdersBoardClient />
      </OrdersProviders>
    </div>
  );
}
