import type { Metadata } from "next";

import { PageHeader } from "@/components/composites/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

import { AdminProviders } from "../admin-providers";
import { AdminAuditClient } from "./admin-audit-client";

export const metadata: Metadata = {
  title: "گزارش حسابرسی | مدیریت پلتفرم",
  description: "مرور اقدامات حساس برای انطباق",
  robots: { index: false, follow: false },
};

export default function AdminAuditPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="گزارش حسابرسی"
        description="اقدامات حساس برای بررسی انطباق؛ فیلتر پذیرنده، بازیگر، و تاریخ شمسی در رابط ادمین."
        breadcrumbs={[
          { label: "مدیریت پلتفرم", href: "/admin" },
          { label: "حسابرسی" },
        ]}
      />

      <Alert>
        <Shield className="size-4" aria-hidden />
        <AlertTitle>دسترسی مدیر پلتفرم</AlertTitle>
        <AlertDescription>
          مشاهدهٔ گزارش حسابرسی نیز ثبت می‌شود · بازهٔ تاریخ‌ها به تقویم شمسی
          (تهران)
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <AdminProviders>
            <AdminAuditClient />
          </AdminProviders>
        </CardContent>
      </Card>
    </div>
  );
}
