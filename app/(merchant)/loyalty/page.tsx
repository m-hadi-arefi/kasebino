import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
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
    <div className="flex flex-col gap-6" lang="fa" dir="rtl">
      <PageHeader
        title="باشگاه مشتریان"
        description="قانون امتیاز هر فروشگاه · مبالغ به تومان · تاریخ‌ها شمسی"
      />
      <MerchantLoyaltyProviders>
        <LoyaltySettingsClient />
      </MerchantLoyaltyProviders>
    </div>
  );
}
