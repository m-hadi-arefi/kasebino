import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";
import {
  ERPNEXT_FINANCE_UI_COPY_FA,
} from "@/modules/erpnext/ui";
import { FinanceDashboardClient } from "@/modules/erpnext/ui/finance-dashboard-client";
import { MerchantFinanceProviders } from "@/modules/erpnext/ui/finance-providers";

const fa = ERPNEXT_FINANCE_UI_COPY_FA;

export const metadata: Metadata = {
  title: "مالی | کاسبینو",
  description: fa.pageDescription,
  robots: { index: false, follow: false },
};

export default async function FinancePage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/finance");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={fa.pageTitle} description={fa.pageDescription} />
      <MerchantFinanceProviders>
        <FinanceDashboardClient />
      </MerchantFinanceProviders>
    </div>
  );
}
