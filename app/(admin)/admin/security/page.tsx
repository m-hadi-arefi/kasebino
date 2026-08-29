import type { Metadata } from "next";

import { PageHeader } from "@/components/composites/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { AdminProviders } from "../admin-providers";
import { AdminSecurityDashboardClient } from "@/modules/admin/ui/security-dashboard-client";

export const metadata: Metadata = {
  title: "سیگنال‌های امنیتی | مدیریت پلتفرم",
  description: "هشدارهای سوءاستفاده، نظارت و پایش امنیتی پلتفرم",
  robots: { index: false, follow: false },
};

export default function AdminSecurityPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="سیگنال‌های امنیتی و پایش پلتفرم"
        description="هشدارهای سوءاستفاده، رصد احراز هویت و نظارت بر امنیت پلتفرم (ADR-154)"
        breadcrumbs={[
          { label: "مدیریت پلتفرم", href: "/admin" },
          { label: "امنیت" },
        ]}
      />

      <Alert>
        <Shield className="size-4" aria-hidden />
        <AlertTitle>دسترسی مدیر پلتفرم</AlertTitle>
        <AlertDescription>
          مشاهدهٔ این صفحه ثبت و ممیزی می‌شود · رویدادها بر اساس زمان جلالی (تهران)
        </AlertDescription>
      </Alert>

      <AdminProviders>
        <AdminSecurityDashboardClient />
      </AdminProviders>
    </div>
  );
}
