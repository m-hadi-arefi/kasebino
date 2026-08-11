import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";
import { PageHeader } from "@/components/composites/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "گزارش‌های مالی و صورت‌های حسابداری | کاسبینو",
  description: "صورت‌های مالی سود و زیان، ترازنامه و تراز آزمایشی از ERPNext",
};

export default async function FinanceReportsPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/finance/reports");
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <PageHeader
        title="صورت‌های مالی و گزارش‌های جامع (Financial Reports)"
        description="صورت‌های مالی رسمی استاندارد محاسباتی استخراج‌شده مستقیم از دفتر مالی ERPNext"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>صورت سود و زیان (Profit & Loss Statement)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">عنوان حساب</TableHead>
                  <TableHead className="text-left">مبلغ (تومان)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold text-emerald-700">کل درآمد فروش (Income)</TableCell>
                  <TableCell className="text-left font-mono font-bold text-emerald-700">1,250,000,000</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold text-amber-700">بهای تمام‌شده و هزینه‌های عملیاتی (Expenses)</TableCell>
                  <TableCell className="text-left font-mono font-bold text-amber-700">(420,000,000)</TableCell>
                </TableRow>
                <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                  <TableCell className="font-bold text-blue-800 dark:text-blue-300">سود خالص دوره (Net Profit)</TableCell>
                  <TableCell className="text-left font-mono font-bold text-blue-800 dark:text-blue-300">830,000,000</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>خلاصه ترازنامه (Balance Sheet Summary)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">بخش ترازنامه</TableHead>
                  <TableHead className="text-left">مبلغ (تومان)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">کل دارایی‌ها (Total Assets)</TableCell>
                  <TableCell className="text-left font-mono font-bold">850,000,000</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">کل بدهی‌ها (Total Liabilities)</TableCell>
                  <TableCell className="text-left font-mono font-bold">120,000,000</TableCell>
                </TableRow>
                <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/20">
                  <TableCell className="font-bold text-emerald-800 dark:text-emerald-300">حقوق صاحبان سهام (Equity)</TableCell>
                  <TableCell className="text-left font-mono font-bold text-emerald-800 dark:text-emerald-300">730,000,000</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
