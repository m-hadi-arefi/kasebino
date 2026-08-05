/**
 * ADR-106 merchant analytics fetch helpers.
 */

import type { ANALYTICS_UI_COPY_FA } from "./copy.js";

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; messageFa?: string };
};

export type AnalyticsRangeDto = {
  fromDay: string;
  toDay: string;
  calendar: "jalali";
  timeZone: "Asia/Tehran";
  labelFa: string;
};

export type OverviewDto = {
  titleFa: string;
  salesCount: number;
  revenueMinor: string;
  activeMemberships: number;
  newMemberships: number;
  monthlyReturningCustomers: number;
  range: AnalyticsRangeDto;
  cacheTtlSeconds: number;
};

export type RevenueDto = {
  titleFa: string;
  salesCount: number;
  revenueMinor: string;
  range: AnalyticsRangeDto;
  days: Array<{ day: string; salesCount: number; revenueMinor: string }>;
};

export type CustomersDto = {
  titleFa: string;
  activeMemberships: number;
  newMemberships: number;
  range: AnalyticsRangeDto;
};

export type RetentionDto = {
  titleFa: string;
  northStarTitleFa: string;
  monthlyReturningCustomers: number;
  range: AnalyticsRangeDto;
};

async function parseJson<T>(res: Response): Promise<Envelope<T>> {
  return (await res.json()) as Envelope<T>;
}

function errorMessage(
  body: Envelope<unknown>,
  fallback: string,
): string {
  return body.error?.messageFa ?? body.error?.message ?? fallback;
}

export async function fetchAnalyticsOverview(): Promise<OverviewDto> {
  const res = await fetch("/api/v1/analytics/merchant/overview", {
    credentials: "same-origin",
  });
  const body = await parseJson<{ overview: OverviewDto }>(res);
  if (!res.ok || !body.data?.overview) {
    throw new Error(errorMessage(body, ANALYTICS_UI_COPY_FA_FALLBACK.error));
  }
  return body.data.overview;
}

export async function fetchAnalyticsRevenue(): Promise<RevenueDto> {
  const res = await fetch("/api/v1/analytics/merchant/revenue", {
    credentials: "same-origin",
  });
  const body = await parseJson<{ revenue: RevenueDto }>(res);
  if (!res.ok || !body.data?.revenue) {
    throw new Error(errorMessage(body, ANALYTICS_UI_COPY_FA_FALLBACK.error));
  }
  return body.data.revenue;
}

export async function fetchAnalyticsCustomers(): Promise<CustomersDto> {
  const res = await fetch("/api/v1/analytics/merchant/customers", {
    credentials: "same-origin",
  });
  const body = await parseJson<{ customers: CustomersDto }>(res);
  if (!res.ok || !body.data?.customers) {
    throw new Error(errorMessage(body, ANALYTICS_UI_COPY_FA_FALLBACK.error));
  }
  return body.data.customers;
}

export async function fetchAnalyticsRetention(): Promise<RetentionDto> {
  const res = await fetch("/api/v1/analytics/merchant/retention", {
    credentials: "same-origin",
  });
  const body = await parseJson<{ retention: RetentionDto }>(res);
  if (!res.ok || !body.data?.retention) {
    throw new Error(errorMessage(body, ANALYTICS_UI_COPY_FA_FALLBACK.error));
  }
  return body.data.retention;
}

/** Avoid circular import at runtime for fallbacks. */
const ANALYTICS_UI_COPY_FA_FALLBACK: typeof ANALYTICS_UI_COPY_FA = {
  overviewTitle: "نمای کلی",
  revenueTitle: "درآمد",
  customersTitle: "مشتریان",
  retentionTitle: "بازماندگی",
  northStarTitle: "مشتریان بازمانده ماهانه",
  salesCount: "تعداد فروش",
  revenueToman: "درآمد (تومان)",
  activeMemberships: "عضویت‌های فعال",
  newMemberships: "عضویت‌های جدید",
  returningCustomers: "مشتریان بازگشتی",
  loading: "در حال بارگذاری داشبورد…",
  empty: "هنوز فروشی ثبت نشده.",
  emptyCustomers: "هنوز مشتری‌ای ثبت نشده.",
  error: "بارگذاری داشبورد ناموفق بود. دوباره تلاش کنید.",
  cacheHint: "به‌روزرسانی کش حدود هر ۶۰ ثانیه",
  jalaliHint: "مبالغ به تومان · بازهٔ تاریخ‌ها به تقویم شمسی (تهران)",
  rangeLabel: "بازهٔ شمسی",
};
