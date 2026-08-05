import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { LoyaltySettingsClient } from "./loyalty-settings-client";
import { MerchantLoyaltyProviders } from "./loyalty-providers";

export const metadata: Metadata = {
  title: "باشگاه مشتریان | کاسبینو",
  description: "تنظیم قانون امتیاز فروشگاه · تومان و انقضای جلالی",
  robots: { index: false, follow: false },
};

export default async function LoyaltySettingsPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/loyalty");
  }

  return (
    <main
      lang="fa"
      dir="rtl"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6"
    >
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          باشگاه مشتریان
        </h1>
        <p className="text-[var(--color-muted)]">
          قانون امتیاز هر فروشگاه · مبالغ به تومان · تاریخ‌ها شمسی
        </p>
      </header>
      <MerchantLoyaltyProviders>
        <LoyaltySettingsClient />
      </MerchantLoyaltyProviders>
    </main>
  );
}
