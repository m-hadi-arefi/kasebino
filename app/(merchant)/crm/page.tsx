"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/composites/loading-state";
import { ErrorState } from "@/components/composites/error-state";
import Link from "next/link";

export default function CrmDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["crm", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/v1/crm/dashboard");
      if (!res.ok) throw new Error("خطا در دریافت اطلاعات داشبورد CRM");
      return res.json();
    },
  });

  const crm = dashboardQuery.data?.crmMetrics;
  const finance = dashboardQuery.data?.financialMetrics;

  return (
    <div className="flex flex-col gap-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">داشبورد مدیریتی CRM کاسبینو</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تحلیل جامع وضعیت ارتباط با مشتریان و خلاصه مالی ERPNext
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/crm/follow-ups">مدیریت پیگیری‌ها</Link>
          </Button>
          <Button asChild>
            <Link href="/customers">لیست مشتریان</Link>
          </Button>
        </div>
      </div>

      {dashboardQuery.isLoading ? (
        <LoadingState rows={4} label="در حال دریافت داده‌های CRM..." />
      ) : null}

      {dashboardQuery.isError ? (
        <ErrorState title="خطا در بارگذاری داده‌های CRM" />
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.isError ? (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  کل مشتریان ثبت‌شده
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{crm?.totalCustomers ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  پایگاه داده کاسبینو
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  مشتریان فعال (۶۰ روز اخیر)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">
                  {crm?.activeCustomers ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  مشتریان دارای تراکنش فعال
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  مشتریان VIP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">
                  {crm?.vipCustomers ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  خریداران عمده و ارزشمند
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  پیگیری‌های باز
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {crm?.pendingFollowUpsCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  نیازمند اقدام همکاران
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ERPNext Financial Overview Section */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">خلاصه مالی ERPNext</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  منبع رسمی داده‌های مالی و حسابداری
                </p>
              </div>
              <Badge variant={finance?.source === "erpnext" ? "default" : "secondary"}>
                {finance?.source === "erpnext"
                  ? "متصل به ERPNext"
                  : finance?.source === "fake"
                    ? "محیط توسعه"
                    : "دفتر مالی آفلاین"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="p-4 bg-muted/40 rounded-lg">
                  <span className="text-xs text-muted-foreground block">
                    فروش امروز
                  </span>
                  <span className="text-xl font-bold mt-1 block">
                    {finance?.todaySales?.displayToman ?? "۰ تومان"}
                  </span>
                </div>
                <div className="p-4 bg-muted/40 rounded-lg">
                  <span className="text-xs text-muted-foreground block">
                    درآمد ماه جاری
                  </span>
                  <span className="text-xl font-bold mt-1 block text-emerald-600">
                    {finance?.monthRevenue?.displayToman ?? "۰ تومان"}
                  </span>
                </div>
                <div className="p-4 bg-muted/40 rounded-lg">
                  <span className="text-xs text-muted-foreground block">
                    مطالبات معوق (Receivables)
                  </span>
                  <span className="text-xl font-bold mt-1 block text-rose-600">
                    {finance?.receivables?.displayToman ?? "۰ تومان"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
