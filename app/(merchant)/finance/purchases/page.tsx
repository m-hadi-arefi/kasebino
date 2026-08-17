import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";
import { getApiContext } from "@/infrastructure/composition";
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
  if (!isMerchantSession(session) || !session?.user?.merchantId) {
    redirect("/login?callbackUrl=/finance/purchases");
  }

  const ctx = getApiContext();
  const merchantId = session.user.merchantId;
  const payRes = await ctx.erpnext.getPayables({ merchantId });
  const pay = payRes.payables;

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
            {pay.totalPayable.displayToman}
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">
              تعداد فاکتورهای پرداختنی
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {pay.invoices.length} فاکتور
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فاکتورهای خرید و بدهی (Purchase Invoices)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">شماره فاکتور خرید</TableHead>
                <TableHead className="text-right">تامین‌کننده</TableHead>
                <TableHead className="text-right">تاریخ ثبت</TableHead>
                <TableHead className="text-right">مبلغ کل</TableHead>
                <TableHead className="text-right">مانده بدهی</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pay.invoices.length > 0 ? (
                pay.invoices.map((inv) => (
                  <TableRow key={inv.invoiceNo}>
                    <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNo}</TableCell>
                    <TableCell>{inv.supplier}</TableCell>
                    <TableCell>{inv.postingDate}</TableCell>
                    <TableCell className="font-mono font-semibold">{inv.grandTotal.displayToman}</TableCell>
                    <TableCell className="font-mono text-amber-600 font-semibold">{inv.outstandingAmount.displayToman}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        پرداخت نشده
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    هیچ فاکتور خرید معوقی یافت نشد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
