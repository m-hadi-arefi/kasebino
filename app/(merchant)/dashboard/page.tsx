import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { SectionHeader } from "@/components/composites/section-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="داشبورد فروشگاه"
        description="نبض حفظ مشتری — فروش، عضویت و بازگشت"
      />

      <StoreSwitcher />

      <section aria-label="ویجت‌های نمای کلی" className="flex flex-col gap-4">
        <SectionHeader
          title="نمای کلی"
          description="مبالغ به تومان · بازهٔ تاریخ‌ها به تقویم شمسی (تهران) · کش حدود ۶۰ ثانیه"
        />
        <DashboardProviders>
          <DashboardAnalyticsWidgets />
          <DashboardCustomersWidget />
        </DashboardProviders>
      </section>

      <p className="text-sm text-muted-foreground">
        این داشبورد فقط برای فروشنده است. فقط پیکاپ حضوری — بدون ارسال/پیک
      </p>
    </div>
  );
}
