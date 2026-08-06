"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Heart,
  TrendingUp,
  Users,
} from "lucide-react";

import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { StatCard } from "@/components/composites/stat-card";
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

  if (loading) {
    return <LoadingState rows={3} label={fa.loading} />;
  }

  if (error) {
    return <ErrorState title={fa.error} />;
  }

  const rangeLabel =
    overview.data?.range != null
      ? `${formatAnalyticsJalaliDay(overview.data.range.fromDay)} — ${formatAnalyticsJalaliDay(overview.data.range.toDay)}`
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {fa.cacheHint} · {fa.jalaliHint}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={BarChart3}
          title={overview.data?.titleFa ?? fa.overviewTitle}
          value={
            overview.data?.salesCount === 0
              ? fa.empty
              : overview.data?.salesCount.toLocaleString("fa-IR") ?? "—"
          }
          description={
            overview.data && overview.data.salesCount > 0
              ? `${fa.revenueToman}: ${formatAnalyticsToman(overview.data.revenueMinor)}`
              : undefined
          }
          trend={rangeLabel ? `${fa.rangeLabel}: ${rangeLabel}` : undefined}
        />
        <StatCard
          icon={TrendingUp}
          title={revenue.data?.titleFa ?? fa.revenueTitle}
          value={
            revenue.data?.salesCount === 0
              ? fa.empty
              : revenue.data
                ? formatAnalyticsToman(revenue.data.revenueMinor)
                : "—"
          }
          description={
            revenue.data && revenue.data.salesCount > 0
              ? `${fa.salesCount}: ${revenue.data.salesCount.toLocaleString("fa-IR")}`
              : undefined
          }
        />
        <StatCard
          icon={Users}
          title={customers.data?.titleFa ?? fa.customersTitle}
          value={
            customers.data &&
            customers.data.activeMemberships === 0 &&
            customers.data.newMemberships === 0
              ? fa.emptyCustomers
              : customers.data?.activeMemberships.toLocaleString("fa-IR") ?? "—"
          }
          description={
            customers.data &&
            (customers.data.activeMemberships > 0 ||
              customers.data.newMemberships > 0)
              ? `${fa.newMemberships}: ${customers.data.newMemberships.toLocaleString("fa-IR")}`
              : undefined
          }
        />
        <StatCard
          icon={Heart}
          title={retention.data?.northStarTitleFa ?? fa.northStarTitle}
          value={
            retention.data?.monthlyReturningCustomers.toLocaleString("fa-IR") ??
            "—"
          }
          description={fa.returningCustomers}
          trend={
            retention.data?.range
              ? `${fa.rangeLabel}: ${formatAnalyticsJalaliDay(retention.data.range.fromDay)} — ${formatAnalyticsJalaliDay(retention.data.range.toDay)}`
              : undefined
          }
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>
    </div>
  );
}
