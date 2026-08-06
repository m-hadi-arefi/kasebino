import type { Metadata } from "next";

import { PageHeader } from "@/components/composites/page-header";
import { StatCard } from "@/components/composites/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Store, TrendingUp, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "مدیریت پلتفرم | کاسبینو",
  description: "پورتفolio فروشندگان، امنیت و حسابرسی",
  robots: { index: false, follow: false },
};

const widgets = [
  {
    id: "overview",
    title: "نمای کلی پلتفرم",
    hint: "فعال‌سازی و تعامل فروشندگان",
    metric: "DAM · MAM · GMV پروکسی (تومان)",
    icon: TrendingUp,
  },
  {
    id: "activation",
    title: "فعال‌سازی فروشندگان",
    hint: "ثبت‌نام تا اولین فروش",
    metric: "نرخ فعال‌سازی",
    icon: Users,
  },
  {
    id: "engagement",
    title: "تعامل فروشندگان",
    hint: "نشست‌های صندوق در بازهٔ شمسی",
    metric: "فروشندگان فعال روزانه",
    icon: Store,
  },
  {
    id: "trust",
    title: "اعتماد و ایمنی",
    hint: "تعلیق‌ها و هشدارهای مشکوک",
    metric: "سیگنال‌های امنیتی",
    icon: Shield,
  },
] as const;

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مدیریت پلتفرم"
        description="پورتفolio فروشندگان، امنیت و حسابرسی"
        eyebrow="کاسبینو · ادمین"
      />

      <Alert>
        <Shield className="size-4" aria-hidden />
        <AlertTitle>دسترسی مدیر پلتفرم</AlertTitle>
        <AlertDescription>
          این بخش فقط برای مدیران پلتفرم است. دسترسی کارکنان فروشگاه مجاز نیست.
          برای ورود به پنل مدیریت وارد شوید. همه اقدامات مدیریتی ثبت و ممیزی
          می‌شوند.
        </AlertDescription>
      </Alert>

      <p className="text-sm text-muted-foreground">
        مبالغ به تومان · بازهٔ تاریخ‌ها به تقویم شمسی (تهران)
      </p>

      <section aria-label="شاخص‌های پورتفolio" className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">نمای کلی پلتفرم</h2>
          <p className="text-sm text-muted-foreground">
            داده از analytics مدیریتی (به‌زودی) · مبالغ GMV پروکسی؛ تطبیق مالی با
            PostgreSQL · فهرست فروشندگان کش کوتاه (~۳۰ث)
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {widgets.map((widget) => (
            <li key={widget.id}>
              <StatCard
                title={widget.title}
                value="—"
                description={widget.hint}
                trend={widget.metric}
                icon={widget.icon}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="جزئیات ویجت‌ها" className="flex flex-col gap-3">
        {widgets.map((widget) => (
          <Card key={widget.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{widget.title}</CardTitle>
              <CardDescription>{widget.hint}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                هنوز دادهٔ مدیریتی برای نمایش نیست.
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <p className="text-sm text-muted-foreground">
        مشاهدهٔ این صفحه نیز ثبت می‌شود. فقط پیکاپ حضوری — بدون ارسال/پیک در
        دامنه‌های تجاری
      </p>
    </div>
  );
}
