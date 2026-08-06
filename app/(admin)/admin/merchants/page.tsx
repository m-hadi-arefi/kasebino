import type { Metadata } from "next";

import { PageHeader } from "@/components/composites/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

import { AdminProviders } from "../admin-providers";
import { AdminMerchantsClient } from "./admin-merchants-client";

export const metadata: Metadata = {
  title: "فهرست فروشندگان | مدیریت پلتفرم",
  description: "مشاهده، فعال‌سازی و تعلیق فروشندگان",
  robots: { index: false, follow: false },
};

export default function AdminMerchantsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="فهرست فروشندگان"
        description="مشاهده، فعال‌سازی و تعلیق فروشندگان"
        breadcrumbs={[
          { label: "مدیریت پلتفرم", href: "/admin" },
          { label: "فروشندگان" },
        ]}
      />

      <Alert>
        <Shield className="size-4" aria-hidden />
        <AlertTitle>دسترسی مدیر پلتفرم</AlertTitle>
        <AlertDescription>
          تعلیق فروشنده دسترسی به صندوق و ویترین را قطع می‌کند. با دقت اقدام
          کنید.
        </AlertDescription>
      </Alert>

      <p className="text-sm text-muted-foreground">
        همه اقدامات مدیریتی ثبت و ممیزی می‌شوند · تقویم شمسی (تهران)
      </p>

      <Card>
        <CardContent className="pt-6">
          <AdminProviders>
            <AdminMerchantsClient />
          </AdminProviders>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        هنوز فروشنده‌ای ثبت نشده ممکن است در فهرست خالی بماند تا API داده
        برگرداند.
      </p>
    </div>
  );
}
