import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";
import { PageHeader } from "@/components/composites/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "فاکتورهای فروش و مطالبات | کاسبینو",
  description: "مدیریت فاکتورهای فروش، برگشت از فروش و مانده بدهی مشتریان",
};

export default async function FinanceSalesPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/finance/sales");
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <PageHeader
        title="فروش و درآمدهای مالی"
        description="فاکتورهای رسمی فروش، اسناد برگشتی و مطالبات مشتریان از دفتر مالی ERPNext"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              کل فروش همگام‌شده
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            1,250,000,000 تومان
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">
              مطالبات معوق مشتریان (AR)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            350,000,000 تومان
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">
              تعداد فاکتورها
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            42 فاکتور
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فاکتورهای اخیر فروش (Sales Invoices)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">شماره فاکتور</TableHead>
                <TableHead className="text-right">نام مشتری</TableHead>
                <TableHead className="text-right">تاریخ صدور</TableHead>
                <TableHead className="text-right">مبلغ کل (تومان)</TableHead>
                <TableHead className="text-right">مانده بدهی (تومان)</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs font-semibold">ACC-SINV-2026-00001</TableCell>
                <TableCell>مشتری حضوری (Cash Customer)</TableCell>
                <TableCell>{new Date().toLocaleDateString("fa-IR")}</TableCell>
                <TableCell className="font-mono font-semibold">15,000,000</TableCell>
                <TableCell className="font-mono text-muted-foreground">0</TableCell>
                <TableCell><Badge variant="default" className="bg-emerald-600">تسویه شده (Paid)</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-xs font-semibold">ACC-SINV-2026-00002</TableCell>
                <TableCell>شرکت آریا تجارت</TableCell>
                <TableCell>{new Date().toLocaleDateString("fa-IR")}</TableCell>
                <TableCell className="font-mono font-semibold">350,000,000</TableCell>
                <TableCell className="font-mono text-destructive font-semibold">350,000,000</TableCell>
                <TableCell><Badge variant="outline" className="border-amber-500 text-amber-600">معوق (Unpaid)</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
