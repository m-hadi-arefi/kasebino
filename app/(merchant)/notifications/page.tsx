import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { NotificationsCenterClient } from "./notifications-center-client";
import { NotificationsProviders } from "./notifications-providers";

export const metadata: Metadata = {
  title: "اعلان‌ها | کاسبینو",
  description: "مرکز اعلان‌های فروشگاه — سفارش و موجودی",
  robots: { index: false, follow: false },
};

export default async function MerchantNotificationsPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/notifications");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="اعلان‌ها"
        description="مرکز اعلان‌های فروشگاه — سفارش و موجودی"
      />
      <NotificationsProviders>
        <NotificationsCenterClient showPageHeader={false} />
      </NotificationsProviders>
    </div>
  );
}
