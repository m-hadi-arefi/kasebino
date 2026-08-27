"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { StatusChip } from "@/components/composites/status-chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/composites/stat-card";
import { Badge } from "@/components/ui/badge";

import { fetchAdminSecurityOverview, type AdminSecurityOverviewDto } from "../api.js";

function severityLabelFa(severity: string): string {
  switch (severity) {
    case "critical":
      return "بحرانی";
    case "warning":
      return "هشدار";
    case "info":
    default:
      return "اطلاعیه";
  }
}

function typeLabelFa(type: string): string {
  switch (type) {
    case "otp_abuse":
      return "سوءاستفاده از OTP";
    case "auth_failure":
      return "شکست ورود/احراز هویت";
    case "suspicious_login":
      return "ورود مشکوک";
    case "unauthorized_access":
      return "دسترسی غیرمجاز";
    case "rate_limit_exceeded":
      return "تجاوز از حد مجاز درخواست";
    case "suspicious_activity":
      return "فعالیت مشکوک";
    case "admin_enforcement":
      return "اقدام نظارتی مدیر";
    default:
      return type;
  }
}

function formatJalali(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function AdminSecurityDashboardClient() {
  const query = useQuery({
    queryKey: ["admin", "security", "overview"],
    queryFn: () => fetchAdminSecurityOverview(),
    refetchInterval: 15000,
  });

  if (query.isLoading) {
    return <LoadingState rows={4} label="در حال دریافت رویدادها و شاخص‌های امنیتی..." />;
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        title={(query.error as Error | null)?.message || "خطا در دریافت اطلاعات پایش امنیت"}
      />
    );
  }

  const { summary, signals } = query.data;

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="هشدارهای فعال"
          value={String(summary.activeAlertsCount)}
          description={
            summary.criticalAlertsCount > 0
              ? `${summary.criticalAlertsCount} مورد بحرانی نیاز به رسیدگی`
              : "وضعیت پایدار"
          }
        />
        <StatCard
          title="شکست احراز هویت (۲۴ ساعت)"
          value={String(summary.authFailures24h)}
          description="تلاش‌های ناموفق لاگین"
        />
        <StatCard
          title="سوءاستفاده OTP (۲۴ ساعت)"
          value={String(summary.otpAbuse24h)}
          description="درخواست‌های مسدود شده پیامک"
        />
        <StatCard
          title="تجاوز نرخ درخواست (۲۴ ساعت)"
          value={String(summary.rateLimitViolations24h)}
          description="محدودسازی نرخ API"
        />
      </div>

      {/* Security Health State */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {summary.criticalAlertsCount > 0 ? (
              <ShieldAlert className="size-5 text-destructive" />
            ) : summary.warningAlertsCount > 0 ? (
              <AlertTriangle className="size-5 text-amber-500" />
            ) : (
              <ShieldCheck className="size-5 text-emerald-500" />
            )}
            وضعیت کلی سلامت امنیتی پلتفرم
          </CardTitle>
          <CardDescription>
            تحلیل زنده رویدادهای احراز هویت، ترافیک ورودی و رفتارهای غیرعادی
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500" />
              <span>بحرانی: <strong>{summary.eventsBySeverity.critical}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>هشدار: <strong>{summary.eventsBySeverity.warning}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" />
              <span>اطلاعیه: <strong>{summary.eventsBySeverity.info}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal Stream */}
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">فید زنده سیگنال‌ها و رویدادهای امنیتی</h3>
        {signals.length === 0 ? (
          <EmptyState
            title="هیچ سیگنال امنیتی ثبت نشده است"
            description="پلتفرم در وضعیت عادی قرار دارد و هیچ فعالیت مشکوکی گزارش نشده است."
            icon={<Shield className="size-6 text-muted-foreground" aria-hidden />}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {signals.map((signal) => (
              <li key={signal.id}>
                <Card className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            signal.severity === "critical"
                              ? "destructive"
                              : signal.severity === "warning"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {severityLabelFa(signal.severity)}
                        </Badge>
                        <span className="font-semibold text-sm">
                          {typeLabelFa(signal.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {signal.source}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {signal.descriptionFa}
                      </p>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                        <span>زمان: {formatJalali(signal.createdAt)}</span>
                        {signal.ip ? <span>IP: {signal.ip}</span> : null}
                        {signal.merchantId ? (
                          <span>پذیرنده: {signal.merchantId.slice(0, 8)}…</span>
                        ) : null}
                        {signal.traceId ? (
                          <span>ردیابی: {signal.traceId}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
