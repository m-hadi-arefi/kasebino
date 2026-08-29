import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { Button } from "@/components/ui/button";
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
      <nav
        aria-label="میانبرهای ارتباط با مشتری"
        className="flex flex-wrap gap-2"
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/crm">نمای ارتباط با مشتری</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/customers/segments">بخش‌بندی</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/customers/tags">برچسب‌ها</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/crm/follow-ups">پیگیری‌ها</Link>
        </Button>
      </nav>
      <MerchantCrmProviders>
        <CustomersListClient />
      </MerchantCrmProviders>
    </div>
  );
}
