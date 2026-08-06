import type { Metadata } from "next";

import { EmptyState } from "@/components/composites/empty-state";
import { PageHeader } from "@/components/composites/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "سیگنال‌های امنیتی | مدیریت پلتفرم",
  description: "هشدارهای سوءاستفاده و اعتماد پلتفرم",
  robots: { index: false, follow: false },
};

export default function AdminSecurityPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="سیگنال‌های امنیتی"
        description="هشدارهای سوءاستفاده و اعتماد پلتفرم"
        breadcrumbs={[
          { label: "مدیریت پلتفرم", href: "/admin" },
          { label: "امنیت" },
        ]}
      />

      <Alert>
        <Shield className="size-4" aria-hidden />
        <AlertTitle>دسترسی مدیر پلتفرم</AlertTitle>
        <AlertDescription>
          مشاهدهٔ این صفحه ثبت و ممیزی می‌شود · تقویم شمسی (تهران)
        </AlertDescription>
      </Alert>

      <EmptyState
        title="هنوز سیگنال امنیتی برای نمایش نیست"
        description="احراز هویت مشکوک · اوج محدودیت نرخ · تعلیق‌ها (به‌زودی)"
        icon={<Shield className="size-6" aria-hidden />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">نمونه‌های هشدار (به‌زودی)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>احراز هویت مشکوک · اوج محدودیت نرخ · تعلیق‌ها</p>
        </CardContent>
      </Card>
    </div>
  );
}
