"use client";

import { ANALYTICS_UI_COPY_FA, formatAnalyticsJalaliDay } from "@/modules/analytics/ui";

const fa = ANALYTICS_UI_COPY_FA;

type DayPoint = {
  day: string;
  salesCount: number;
  revenueMinor: string;
};

type DashboardRevenueTrendProps = {
  days: DayPoint[];
};

export function DashboardRevenueTrend({ days }: DashboardRevenueTrendProps) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border px-4 py-6">
        {fa.trendEmpty}
      </p>
    );
  }

  const values = days.map((d) => {
    try {
      return Number(BigInt(d.revenueMinor));
    } catch {
      return 0;
    }
  });
  const max = Math.max(...values, 1);

  return (
    <div
      className="rounded-md border border-border bg-card px-3 py-4"
      role="img"
      aria-label={fa.trendTitle}
    >
      <div className="flex h-36 items-end gap-1.5" dir="ltr">
        {days.map((d, i) => {
          const v = values[i] ?? 0;
          const heightPct = Math.max(4, Math.round((v / max) * 100));
          return (
            <div
              key={d.day}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${formatAnalyticsJalaliDay(d.day)} · ${d.salesCount}`}
            >
              <div
                className="w-full max-w-8 rounded-t-sm bg-primary/80 transition-all"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground" dir="rtl">
        <span>{formatAnalyticsJalaliDay(days[0]!.day)}</span>
        <span>{formatAnalyticsJalaliDay(days[days.length - 1]!.day)}</span>
      </div>
    </div>
  );
}
