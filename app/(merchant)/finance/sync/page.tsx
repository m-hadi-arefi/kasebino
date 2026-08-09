import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";
import { ERPNEXT_FINANCE_UI_COPY_FA } from "@/modules/erpnext/ui";
import { FinanceSyncStatusClient } from "@/modules/erpnext/ui/sync-status-client";
import { MerchantFinanceProviders } from "@/modules/erpnext/ui/finance-providers";

const fa = ERPNEXT_FINANCE_UI_COPY_FA;

export const metadata: Metadata = {
  title: "همگام‌سازی مالی | کاسبینو",
  description: fa.syncDescription,
  robots: { index: false, follow: false },
};

export default async function FinanceSyncPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/finance/sync");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fa.syncTitle}
        description={fa.syncDescription}
        breadcrumbs={[
          { label: fa.pageTitle, href: "/finance" },
          { label: fa.syncTitle },
        ]}
      />
      <MerchantFinanceProviders>
        <FinanceSyncStatusClient />
      </MerchantFinanceProviders>
    </div>
  );
}
