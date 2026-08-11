import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";
import { PageHeader } from "@/components/composites/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "خرید و بدهی تامین‌کنندگان | کاسبینو",
  description: "مدیریت فاکتورهای خرید، بدهی به تامین‌کنندگان و حساب‌های پرداختنی",
};

export default async function FinancePurchasesPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/finance/purchases");
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <PageHeader
        title="خرید و تامین‌کنندگان (Purchases & AP)"
        description="فاکتورهای رسمی خرید کالا، بدهی به تامین‌کنندگان و ثبت اسناد ورودی انبار"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">
              کل بدهی به تامین‌کنندگان (AP)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            120,000,000 تومان
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">
              خرید کل این ماه
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            420,000,000 تومان
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فاکتورهای خرید (Purchase Invoices)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">شماره فاکتور خرید</TableHead>
                <TableHead className="text-right">تامین‌کننده</TableHead>
                <TableHead className="text-right">تاریخ ثبت</TableHead>
                <TableHead className="text-right">مبلغ کل (تومان)</TableHead>
                <TableHead className="text-right">مانده بدهی (تومان)</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs font-semibold">ACC-PINV-2026-00001</TableCell>
                <TableCell>شرکت پخش سراسری البرز</TableCell>
                <TableCell>{new Date().toLocaleDateString("fa-IR")}</TableCell>
                <TableCell className="font-mono font-semibold">120,000,000</TableCell>
                <TableCell className="font-mono text-amber-600 font-semibold">120,000,000</TableCell>
                <TableCell><Badge variant="outline" className="border-amber-500 text-amber-600">پرداخت نشده (Unpaid)</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
