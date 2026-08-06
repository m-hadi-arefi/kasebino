import { EmptyState } from "@/components/composites/empty-state";
import { PageHeader } from "@/components/composites/page-header";
import { PhoneKeypad } from "@/components/composites/phone-keypad";
import { StatCard } from "@/components/composites/stat-card";
import { StatusChip } from "@/components/composites/status-chip";
import { TomanDisplay } from "@/components/composites/toman-display";
import { JalaliDateText } from "@/components/composites/jalali-date-text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Info, TrendingUp } from "lucide-react";

import { UiKitToastButton } from "./ui-kit-toast-button";

/**
 * ADR-114 / ADR-125 — Persian RTL smoke page for shadcn primitives + composites.
 */
export default function UiKitPage() {
  return (
    <main
      dir="rtl"
      lang="fa"
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 overflow-x-clip bg-background px-4 py-8 text-foreground"
    >
      <Toaster />
      <PageHeader
        eyebrow="کاسبینو · کتابخانهٔ رابط کاربری"
        title="نمونهٔ پریمیتیو و کامپوزیت"
        description="چیدمان راست‌به‌چپ، تایپوگرافی فارسی، اهداف لمسی بزرگ برای اندروید فروشگاهی."
      />

      <Tabs defaultValue="primitives" className="w-full min-w-0">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="primitives" className="w-full">
            پریمیتیوها
          </TabsTrigger>
          <TabsTrigger value="feedback" className="w-full">
            بازخورد
          </TabsTrigger>
          <TabsTrigger value="composites" className="w-full">
            کامپوزیت‌ها
          </TabsTrigger>
          <TabsTrigger value="iranian" className="w-full">
            ایرانی
          </TabsTrigger>
        </TabsList>

        <TabsContent value="primitives" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>فرم پایه</CardTitle>
              <CardDescription>برچسب و ورودی با فاصلهٔ منطقی RTL</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sample-name">نام فروشگاه</Label>
                <Input id="sample-name" placeholder="مثلاً سوپرمارکت گلستان" />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="sample-consent" />
                <Label htmlFor="sample-consent">شرایط استفاده را می‌پذیرم</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button">ذخیره</Button>
                <Button type="button" variant="outline">
                  انصراف
                </Button>
                <Badge>نشان</Badge>
                <UiKitToastButton />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>جدول نمونه</CardTitle>
              <CardDescription>تراز متن از ابتدا (start) برای فارسی</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>کالا</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>چای ایرانی</TableCell>
                    <TableCell>
                      <StatusChip status="active" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>قاشق یک‌بارمصرف</TableCell>
                    <TableCell>
                      <StatusChip status="pending" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="flex flex-col gap-6">
          <Alert>
            <Info className="size-4" aria-hidden />
            <AlertTitle>اطلاع‌رسانی</AlertTitle>
            <AlertDescription>
              نمونهٔ هشدار خنثی برای راهنمایی کاربر در جریان ثبت‌نام.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>اسکلت بارگذاری</CardTitle>
              <CardDescription>Placeholder تا رسیدن داده از API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>

          <Tabs defaultValue="tab-a">
            <TabsList>
              <TabsTrigger value="tab-a">خلاصه</TabsTrigger>
              <TabsTrigger value="tab-b">جزئیات</TabsTrigger>
            </TabsList>
            <TabsContent value="tab-a" className="text-sm text-muted-foreground">
              محتوای تب اول — مثلاً KPI روزانه.
            </TabsContent>
            <TabsContent value="tab-b" className="text-sm text-muted-foreground">
              محتوای تب دوم — فهرست تراکنش‌ها.
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="composites" className="flex flex-col gap-6">
          <StatCard
            title="فروش امروز"
            value={<TomanDisplay toman={4_250_000} />}
            description="تقویم شمسی · Asia/Tehran"
            trend="+۱۲٪ نسبت به دیروز"
            icon={TrendingUp}
          />

          <EmptyState
            title="هنوز سفارشی ثبت نشده"
            description="وقتی مشتری از ویترین سفارش دهد، اینجا نمایش داده می‌شود."
          />
        </TabsContent>

        <TabsContent value="iranian" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>شماره موبایل</CardTitle>
              <CardDescription>صفحه کلید بزرگ برای صندوق</CardDescription>
            </CardHeader>
            <CardContent>
              <PhoneKeypad />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>مبلغ و تاریخ</CardTitle>
              <CardDescription>تومان و جلالی · Asia/Tehran</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-lg">
              <p>
                مبلغ: <TomanDisplay toman={125_000} />
              </p>
              <p>
                تاریخ:{" "}
                <JalaliDateText value="2026-03-21T12:00:00.000Z" />
              </p>
              <div className="flex flex-wrap gap-2">
                <StatusChip status="ready" />
                <StatusChip status="suspended" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
