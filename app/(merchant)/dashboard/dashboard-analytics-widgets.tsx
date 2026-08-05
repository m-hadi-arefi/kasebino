"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  ANALYTICS_UI_COPY_FA,
  fetchAnalyticsCustomers,
  fetchAnalyticsOverview,
  fetchAnalyticsRetention,
  fetchAnalyticsRevenue,
  formatAnalyticsJalaliDay,
  formatAnalyticsToman,
} from "@/modules/analytics/ui";

const fa = ANALYTICS_UI_COPY_FA;

function WidgetShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="font-medium text-[var(--color-fg)]">{title}</p>
      {children}
    </li>
  );
}

export function DashboardAnalyticsWidgets() {
  const overview = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: fetchAnalyticsOverview,
  });
  const revenue = useQuery({
    queryKey: ["analytics", "revenue"],
    queryFn: fetchAnalyticsRevenue,
  });
  const customers = useQuery({
    queryKey: ["analytics", "customers"],
    queryFn: fetchAnalyticsCustomers,
  });
  const retention = useQuery({
    queryKey: ["analytics", "retention"],
    queryFn: fetchAnalyticsRetention,
  });

  const loading =
    overview.isLoading ||
    revenue.isLoading ||
    customers.isLoading ||
    retention.isLoading;
  const error =
    overview.error || revenue.error || customers.error || retention.error;

  return (
    <>
      <p className="text-sm text-[var(--color-muted)]">{fa.cacheHint}</p>
      <p className="text-sm text-[var(--color-muted)]">{fa.jalaliHint}</p>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
          {fa.loading}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {fa.error}
        </p>
      ) : null}

      <WidgetShell title={overview.data?.titleFa ?? fa.overviewTitle}>
        {overview.data ? (
          overview.data.salesCount === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-muted)]">{fa.empty}</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1 text-sm text-[var(--color-fg)]">
              <p>
                {fa.salesCount}: {overview.data.salesCount.toLocaleString("fa-IR")}
              </p>
              <p>
                {fa.revenueToman}:{" "}
                {formatAnalyticsToman(overview.data.revenueMinor)}
              </p>
              <p>
                {fa.activeMemberships}:{" "}
                {overview.data.activeMemberships.toLocaleString("fa-IR")}
              </p>
              <p className="text-[var(--color-muted)]">
                {fa.rangeLabel}:{" "}
                {formatAnalyticsJalaliDay(overview.data.range.fromDay)} —{" "}
                {formatAnalyticsJalaliDay(overview.data.range.toDay)}
              </p>
            </div>
          )
        ) : null}
      </WidgetShell>

      <WidgetShell title={revenue.data?.titleFa ?? fa.revenueTitle}>
        {revenue.data ? (
          revenue.data.salesCount === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-muted)]">{fa.empty}</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1 text-sm text-[var(--color-fg)]">
              <p>{formatAnalyticsToman(revenue.data.revenueMinor)}</p>
              <p className="text-[var(--color-muted)]">
                {fa.salesCount}: {revenue.data.salesCount.toLocaleString("fa-IR")}
              </p>
            </div>
          )
        ) : null}
      </WidgetShell>

      <WidgetShell title={customers.data?.titleFa ?? fa.customersTitle}>
        {customers.data ? (
          customers.data.activeMemberships === 0 &&
          customers.data.newMemberships === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {fa.emptyCustomers}
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-1 text-sm text-[var(--color-fg)]">
              <p>
                {fa.activeMemberships}:{" "}
                {customers.data.activeMemberships.toLocaleString("fa-IR")}
              </p>
              <p>
                {fa.newMemberships}:{" "}
                {customers.data.newMemberships.toLocaleString("fa-IR")}
              </p>
            </div>
          )
        ) : null}
      </WidgetShell>

      <WidgetShell
        title={retention.data?.northStarTitleFa ?? fa.northStarTitle}
      >
        {retention.data ? (
          <div className="mt-2 flex flex-col gap-1 text-sm text-[var(--color-fg)]">
            <p className="text-2xl font-semibold tabular-nums">
              {retention.data.monthlyReturningCustomers.toLocaleString("fa-IR")}
            </p>
            <p className="text-[var(--color-muted)]">{fa.returningCustomers}</p>
            <p className="text-[var(--color-muted)]">
              {fa.rangeLabel}:{" "}
              {formatAnalyticsJalaliDay(retention.data.range.fromDay)} —{" "}
              {formatAnalyticsJalaliDay(retention.data.range.toDay)}
            </p>
          </div>
        ) : null}
      </WidgetShell>
    </>
  );
}
