import { PhoneKeypad } from "@/components/composites/phone-keypad";
import { TomanDisplay } from "@/components/composites/toman-display";
import { StatusChip } from "@/components/composites/status-chip";
import { JalaliDateText } from "@/components/composites/jalali-date-text";
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
import { Toaster } from "@/components/ui/sonner";
import { UiKitToastButton } from "./ui-kit-toast-button";

/**
 * ADR-114 — Persian RTL smoke page for shadcn primitives + Iranian composites.
 * Not a marketing landing; kit proof only.
 */
export default function UiKitPage() {
  return (
    <main
      dir="rtl"
      lang="fa"
      className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 bg-background px-4 py-8 text-foreground"
    >
      <Toaster />
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">کاسبینو · کتابخانهٔ رابط کاربری</p>
        <h1 className="text-2xl font-semibold tracking-tight">نمونهٔ پریمیتیو و کامپوزیت</h1>
        <p className="text-muted-foreground">
          چیدمان راست‌به‌چپ، تایپوگرافی فارسی، اهداف لمسی بزرگ برای اندروید فروشگاهی.
        </p>
      </header>

      <Tabs defaultValue="primitives">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="primitives">پریمیتیوها</TabsTrigger>
          <TabsTrigger value="iranian">ایرانی</TabsTrigger>
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
