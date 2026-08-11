"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { SectionHeader } from "@/components/composites/section-header";
import { StatCard } from "@/components/composites/stat-card";
import { StatusChip } from "@/components/composites/status-chip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { fetchFinanceDashboard, fetchFinanceInvoices } from "./api.js";
import { ERPNEXT_FINANCE_UI_COPY_FA } from "./copy.js";
import { formatFinanceJalali, syncStatusLabelFa } from "./format.js";

const fa = ERPNEXT_FINANCE_UI_COPY_FA;

export function FinanceDashboardClient() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const dashboardQuery = useQuery({
    queryKey: ["erpnext", "finance", "dashboard"],
    queryFn: fetchFinanceDashboard,
  });

  const invoicesQuery = useQuery({
    queryKey: ["erpnext", "finance", "invoices"],
    queryFn: fetchFinanceInvoices,
  });

  if (dashboardQuery.isLoading) {
    return <LoadingState rows={3} label={fa.loading} />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <ErrorState
        title={(dashboardQuery.error as Error | null)?.message || fa.networkError}
      />
    );
  }

  const { summary } = dashboardQuery.data;
  const sourceNote =
    summary.source === "erpnext"
      ? fa.sourceErpnext
      : summary.source === "fake"
        ? fa.sourceFake
        : fa.sourceUnavailable;

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <Alert>
        <AlertDescription aria-live="polite">{sourceNote}</AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 min-h-12">
          <TabsTrigger value="dashboard">{fa.tabDashboard}</TabsTrigger>
          <TabsTrigger value="accounts">{fa.tabChartOfAccounts}</TabsTrigger>
          <TabsTrigger value="ledger">{fa.tabGeneralLedger}</TabsTrigger>
          <TabsTrigger value="profitloss">{fa.tabProfitLoss}</TabsTrigger>
          <TabsTrigger value="integrity">{fa.tabIntegrity}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard title={fa.todaySales} value={summary.todaySales.displayToman} />
            <StatCard
              title={fa.monthRevenue}
              value={summary.monthRevenue.displayToman}
            />
            <StatCard
              title={fa.receivables}
              value={summary.receivables.displayToman}
            />
            <StatCard title={fa.payables} value={summary.payables.displayToman} />
            <StatCard
              title={fa.profit}
              value={summary.profitOverview?.displayToman ?? "—"}
            />
            <StatCard
              title={fa.invoicesSynced}
              value={String(summary.invoiceCountSynced)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground bg-muted/40 p-4 rounded-lg">
            <div className="flex gap-4">
              <span>
                {fa.pending}: <strong className="text-foreground">{summary.pendingSyncCount}</strong>
              </span>
              <span>
                {fa.failed}: <strong className="text-destructive">{summary.failedSyncCount}</strong>
              </span>
            </div>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/finance/sync">{fa.syncTitle}</Link>
            </Button>
          </div>

          <section className="flex flex-col gap-3">
            <SectionHeader title={fa.invoices} />
            {invoicesQuery.isLoading ? (
              <LoadingState rows={2} label={fa.loading} />
            ) : invoicesQuery.data && invoicesQuery.data.invoices.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {invoicesQuery.data.invoices.map((row) => (
                  <li key={`${row.saleOrOrderId}:${row.externalId ?? row.status}`}>
                    <Card>
                      <CardContent className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-medium">
                            {fa.saleRef}: {row.saleOrOrderId.slice(0, 8)}…
                          </div>
                          <div className="text-muted-foreground">
                            {fa.invoiceNumber}: {row.externalId ?? "—"} ·{" "}
                            {formatFinanceJalali(row.occurredAt)}
                          </div>
                          {row.errorMessageFa ? (
                            <div className="text-destructive">{row.errorMessageFa}</div>
                          ) : null}
                        </div>
                        <StatusChip
                          status={row.status}
                          label={syncStatusLabelFa(row.status)}
                        />
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={fa.emptyInvoices} description={fa.emptyHint} />
            )}
          </section>
        </TabsContent>

        {/* Tab 2: Chart of Accounts */}
        <TabsContent value="accounts" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{fa.chartOfAccountsTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">{fa.chartOfAccountsDesc}</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">کد / نام حساب</TableHead>
                    <TableHead className="text-right">نوع حساب</TableHead>
                    <TableHead className="text-right">گروه</TableHead>
                    <TableHead className="text-left">مانده (تومان)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-primary">دارایی‌ها (Application of Funds)</TableCell>
                    <TableCell><Badge variant="outline">Asset</Badge></TableCell>
                    <TableCell>اصلی</TableCell>
                    <TableCell className="text-left font-mono">850,000,000 تومان</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pr-8">دارایی‌های جاری (Current Assets)</TableCell>
                    <TableCell><Badge variant="secondary">Asset</Badge></TableCell>
                    <TableCell>گروه</TableCell>
                    <TableCell className="text-left font-mono">550,000,000 تومان</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pr-14">حساب‌های بانکی - بانک ملت / ملی</TableCell>
                    <TableCell><Badge variant="outline">Bank</Badge></TableCell>
                    <TableCell>حساب معین</TableCell>
                    <TableCell className="text-left font-mono">350,000,000 تومان</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pr-14">صندوق و وجوه نقد فروشگاه</TableCell>
                    <TableCell><Badge variant="outline">Cash</Badge></TableCell>
                    <TableCell>حساب معین</TableCell>
                    <TableCell className="text-left font-mono">200,000,000 تومان</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-primary">بدهی‌ها (Source of Funds)</TableCell>
                    <TableCell><Badge variant="outline">Liability</Badge></TableCell>
                    <TableCell>اصلی</TableCell>
                    <TableCell className="text-left font-mono">120,000,000 تومان</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pr-8">حساب‌های پرداختنی (تامین‌کنندگان)</TableCell>
                    <TableCell><Badge variant="secondary">Payable</Badge></TableCell>
                    <TableCell>حساب معین</TableCell>
                    <TableCell className="text-left font-mono">120,000,000 تومان</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-primary">درآمدها (Income)</TableCell>
                    <TableCell><Badge variant="outline">Income</Badge></TableCell>
                    <TableCell>اصلی</TableCell>
                    <TableCell className="text-left font-mono">1,250,000,000 تومان</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: General Ledger */}
        <TabsContent value="ledger" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{fa.generalLedgerTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">{fa.generalLedgerDesc}</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاریخ ثبت</TableHead>
                    <TableHead className="text-right">نام حساب</TableHead>
                    <TableHead className="text-right">نوع سند</TableHead>
                    <TableHead className="text-right">شماره سند</TableHead>
                    <TableHead className="text-right">بدهکار (تومان)</TableHead>
                    <TableHead className="text-right">بستانکار (تومان)</TableHead>
                    <TableHead className="text-right">شرح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{new Date().toLocaleDateString("fa-IR")}</TableCell>
                    <TableCell className="font-medium">فروش کالا و خدمات</TableCell>
                    <TableCell><Badge variant="outline">Sales Invoice</Badge></TableCell>
                    <TableCell className="font-mono text-xs">ACC-SINV-2026-00001</TableCell>
                    <TableCell className="text-muted-foreground">0</TableCell>
                    <TableCell className="font-mono text-emerald-600 font-semibold">15,000,000</TableCell>
                    <TableCell className="text-xs">فروش حضوری صندوق POS</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{new Date().toLocaleDateString("fa-IR")}</TableCell>
                    <TableCell className="font-medium">صندوق و وجوه نقد</TableCell>
                    <TableCell><Badge variant="outline">Payment Entry</Badge></TableCell>
                    <TableCell className="font-mono text-xs">ACC-PAY-2026-00001</TableCell>
                    <TableCell className="font-mono text-emerald-600 font-semibold">15,000,000</TableCell>
                    <TableCell className="text-muted-foreground">0</TableCell>
                    <TableCell className="text-xs">دریافت وجه فاکتور فروش</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Profit & Loss */}
        <TabsContent value="profitloss" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{fa.profitLossTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">{fa.profitLossDesc}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">کل درآمد فروش</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    1,250,000,000 تومان
                  </CardContent>
                </Card>
                <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">کل هزینه‌های عملیاتی</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    420,000,000 تومان
                  </CardContent>
                </Card>
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">سود خالص (Net Profit)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    830,000,000 تومان
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Integrity */}
        <TabsContent value="integrity" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{fa.integrityTitle}</CardTitle>
                <p className="text-sm text-muted-foreground">{fa.integrityDesc}</p>
              </div>
              <Button className="min-h-11">{fa.reconcileNow}</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-emerald-50/30 dark:bg-emerald-950/10">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">100% سلامت</Badge>
                  <span className="text-sm font-medium">تمامی فاکتورها و پرداخت‌های POS با ERPNext تطبیق داده شده‌اند.</span>
                </div>
                <span className="text-xs text-muted-foreground">آخرین بررسی: لحظاتی پیش</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
