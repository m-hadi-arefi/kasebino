import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "کاسبینو",
  description: "سیستم عامل خرده‌فروشی ایرانی",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
