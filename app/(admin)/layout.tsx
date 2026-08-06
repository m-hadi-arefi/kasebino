import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "مدیریت پلتفرم | کاسبینو",
  description: "پنل مدیریت پلتفرم کاسبینو",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <AppShell variant="admin">{children}</AppShell>
      <Toaster richColors closeButton position="top-center" dir="rtl" />
    </>
  );
}
