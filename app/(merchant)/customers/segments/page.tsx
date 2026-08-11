"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/composites/loading-state";
import { ErrorState } from "@/components/composites/error-state";
import { Button } from "@/components/ui/button";
import { MerchantCrmProviders } from "../crm-providers";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SegmentInfo = {
  id: string;
  nameFa: string;
  descriptionFa: string;
  count: number;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
};

function CustomerSegmentsContent() {
  const segmentsQuery = useQuery({
    queryKey: ["crm", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/v1/crm/dashboard");
      if (!res.ok) throw new Error("خطا در دریافت اطلاعات بخش‌بندی");
      return res.json();
    },
  });

  const metrics = segmentsQuery.data?.crmMetrics;

  const segments: SegmentInfo[] = [
    {
      id: "active",
      nameFa: "مشتریان فعال",
      descriptionFa: "مشتریانی که در ۶۰ روز گذشته خرید داشته‌اند",
      count: metrics?.activeCustomers ?? 0,
      badgeVariant: "default",
    },
    {
      id: "new",
      nameFa: "مشتریان جدید",
      descriptionFa: "مشتریانی که به‌تازگی ثبت شده‌اند یا حداکثر ۱ خرید دارند",
      count: metrics?.totalCustomers ? Math.max(0, metrics.totalCustomers - (metrics.activeCustomers ?? 0)) : 0,
      badgeVariant: "secondary",
    },
    {
      id: "vip",
      nameFa: "مشتریان VIP / خوش‌حساب",
      descriptionFa: "مشتریان با حجم خرید بالا و وفاداری عالی",
      count: metrics?.vipCustomers ?? 0,
      badgeVariant: "outline",
    },
    {
      id: "inactive",
      nameFa: "مشتریان غیرفعال / راکد",
      descriptionFa: "مشتریانی که بیش از ۶۰ روز خریدی انجام نداده‌اند",
      count: metrics?.inactiveCustomers ?? 0,
      badgeVariant: "destructive",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">بخش‌بندی هوشمند مشتریان</h1>
          <p className="text-sm text-muted-foreground mt-1">
            دسته بندی مشتریان بر اساس رفتار خرید، میزان وفاداری و وضعیت بدهی
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/customers">بازگشت به لیست مشتریان</Link>
        </Button>
      </div>

      {segmentsQuery.isLoading ? (
        <LoadingState rows={4} label="در حال دریافت اطلاعات بخش‌بندی..." />
      ) : null}

      {segmentsQuery.isError ? (
        <ErrorState title="خطا در دریافت اطلاعات بخش‌بندی مشتریان" />
      ) : null}

      {!segmentsQuery.isLoading && !segmentsQuery.isError ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{s.nameFa}</CardTitle>
                <Badge variant={s.badgeVariant} className="text-sm px-3 py-1">
                  {s.count} مشتری
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {s.descriptionFa}
                </p>
                <Button asChild size="sm" variant="ghost" className="w-full">
                  <Link href={`/customers?status=${s.id}`}>
                    مشاهده مشتریان این بخش ←
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CustomerSegmentsPage() {
  return (
    <MerchantCrmProviders>
      <CustomerSegmentsContent />
    </MerchantCrmProviders>
  );
}
