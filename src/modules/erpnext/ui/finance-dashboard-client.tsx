"use client";

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
import { Card, CardContent } from "@/components/ui/card";

import { fetchFinanceDashboard, fetchFinanceInvoices } from "./api.js";
import { ERPNEXT_FINANCE_UI_COPY_FA } from "./copy.js";
import { formatFinanceJalali, syncStatusLabelFa } from "./format.js";

const fa = ERPNEXT_FINANCE_UI_COPY_FA;

export function FinanceDashboardClient() {
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
    <div className="flex flex-col gap-6">
      <Alert>
        <AlertDescription aria-live="polite">{sourceNote}</AlertDescription>
      </Alert>

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

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span>
          {fa.pending}: {summary.pendingSyncCount}
        </span>
        <span>
          {fa.failed}: {summary.failedSyncCount}
        </span>
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
    </div>
  );
}
