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
  title: "فاکتورهای فروش و مطالبات | کاسبینو",
  description: "مدیریت فاکتورهای فروش، برگشت از فروش و مانده بدهی مشتریان",
};

export default async function FinanceSalesPage() {
  const session = await auth();
  if (!isMerchantSession(session) || !session?.user?.merchantId) {
    redirect("/login?callbackUrl=/finance/sales");
  }

  const ctx = getApiContext();
  const merchantId = session.user.merchantId;

  const [dashRes, recRes, invRes] = await Promise.all([
    ctx.erpnext.getFinanceDashboard({ merchantId }),
    ctx.erpnext.getReceivables({ merchantId }),
    ctx.erpnext.listFinanceInvoices({ merchantId, limit: 50 }),
  ]);

  const dash = dashRes.summary;
  const rec = recRes.receivables;
  const invoices = invRes.invoices;

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
            {dash.monthRevenue.displayToman}
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">
              مطالبات معوق مشتریان (AR)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {rec.totalReceivable.displayToman}
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">
              تعداد فاکتورهای همگام‌شده
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {dash.invoiceCountSynced} فاکتور
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
                <TableHead className="text-right">شناسه / شماره فاکتور</TableHead>
                <TableHead className="text-right">کانال فروش</TableHead>
                <TableHead className="text-right">کد ERPNext</TableHead>
                <TableHead className="text-right">تاریخ ثبت</TableHead>
                <TableHead className="text-right">وضعیت همگام‌سازی</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <TableRow key={inv.saleOrOrderId}>
                    <TableCell className="font-mono text-xs font-semibold">{inv.saleOrOrderId}</TableCell>
                    <TableCell>{inv.channel === "pos" ? "صندوق حضوری (POS)" : "سفارش آنلاین"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{inv.externalId ?? "—"}</TableCell>
                    <TableCell>{inv.occurredAt ? new Date(inv.occurredAt).toLocaleDateString("fa-IR") : "—"}</TableCell>
                    <TableCell>
                      {inv.status === "synced" ? (
                        <Badge variant="default" className="bg-emerald-600">
                          همگام‌شده
                        </Badge>
                      ) : inv.status === "pending" ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          در حال ارسال
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          ناموفق
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    هیچ فاکتور فروشی یافت نشد
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
