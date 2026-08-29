"use client";

import Link from "next/link";

import { EmptyState } from "@/components/composites/empty-state";
import { PageHeader } from "@/components/composites/page-header";
import { Button } from "@/components/ui/button";

const COPY = {
  title: "این بخش هنوز در دسترس نیست",
  description:
    "خرید، تامین‌کننده، هزینه، خزانه، گزارش دفتری بومی و مرجوعی هنوز به دفتر عملیاتی متصل نشده‌اند. صندوق، موجودی، مشتریان و مالی همگام‌سازی‌شده همچنان کار می‌کنند.",
  ctaDashboard: "بازگشت به داشبورد",
  ctaFinance: "مالی (دفتر)",
  ctaInventory: "موجودی",
} as const;

export function UnavailableCapabilityPage() {
  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <PageHeader title={COPY.title} description={COPY.description} />
      <EmptyState
        title={COPY.title}
        description={COPY.description}
        actionHref="/dashboard"
        actionLabel={COPY.ctaDashboard}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/finance">{COPY.ctaFinance}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/inventory">{COPY.ctaInventory}</Link>
        </Button>
      </div>
    </div>
  );
}
