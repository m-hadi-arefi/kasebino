import type { ReactNode } from "react";

import { auth } from "@/auth";
import { PermissionsProvider } from "@/components/auth/permissions-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { hydrateMerchantSessionClaims } from "@/infrastructure/http/require-auth";

export default async function MerchantLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = (await auth()) as AuthSessionSnapshot;
  const api = getApiContext();
  const hydrated = await hydrateMerchantSessionClaims(
    session,
    api.repos.merchants,
  );

  return (
    <PermissionsProvider
      initialRoles={hydrated?.user?.roles ?? hydrated?.roles ?? []}
      initialPermissions={
        hydrated?.user?.permissions ?? hydrated?.permissions ?? []
      }
      initialStoreIds={hydrated?.user?.storeIds ?? hydrated?.storeIds ?? []}
      merchantId={hydrated?.user?.merchantId ?? hydrated?.merchantId ?? null}
    >
      <AppShell variant="merchant">{children}</AppShell>
      <Toaster richColors closeButton position="top-center" dir="rtl" />
    </PermissionsProvider>
  );
}
