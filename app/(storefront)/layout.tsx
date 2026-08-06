import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "ویترین فروشگاه | کاسبینو",
    template: "%s | کاسبینو",
  },
  description: "فروشگاه محلی — سفارش فقط به‌صورت حضوری (پیکاپ)",
};

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div lang="fa" dir="rtl" className="min-h-dvh bg-background text-foreground">
      {children}
    </div>
  );
}
