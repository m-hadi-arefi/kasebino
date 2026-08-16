import type { ReactNode } from "react";

import { auth } from "@/auth";
import { PermissionsProvider } from "@/components/auth/permissions-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";

export default async function MerchantLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = (await auth()) as AuthSessionSnapshot;

  return (
    <PermissionsProvider
      initialRoles={session?.user?.roles ?? []}
      initialPermissions={session?.user?.permissions ?? []}
      initialStoreIds={session?.user?.storeIds ?? []}
      merchantId={session?.user?.merchantId ?? null}
    >
      <AppShell variant="merchant">{children}</AppShell>
      <Toaster richColors closeButton position="top-center" dir="rtl" />
    </PermissionsProvider>
  );
}

