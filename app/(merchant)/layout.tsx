import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

export default function MerchantLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <AppShell variant="merchant">{children}</AppShell>
      <Toaster richColors closeButton position="top-center" dir="rtl" />
    </>
  );
}
