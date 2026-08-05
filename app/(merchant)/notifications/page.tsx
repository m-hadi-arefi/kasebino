import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <NotificationsProviders>
        <NotificationsCenterClient />
      </NotificationsProviders>
    </main>
  );
}
