import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { CustomersListClient } from "./customers-list-client";
import { MerchantCrmProviders } from "./crm-providers";

export const metadata: Metadata = {
  title: "مشتریان | کاسبینو",
  description: "اعضای مغازه — شماره موبایل ایرانی",
  robots: { index: false, follow: false },
};

export default async function CustomersPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/customers");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مشتریان"
        description="اعضای مغازه — شماره موبایل ایرانی · مبلغ به تومان · تاریخ شمسی"
      />
      <MerchantCrmProviders>
        <CustomersListClient />
      </MerchantCrmProviders>
    </div>
  );
}
