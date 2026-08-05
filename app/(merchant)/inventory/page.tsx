import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { MerchantCatalogProviders } from "../products/catalog-providers";
import { InventoryClient } from "./inventory-client";

export const metadata: Metadata = {
  title: "موجودی | کاسبینو",
  description: "تعدیل موجودی قفسه فروشگاه",
  robots: { index: false, follow: false },
};

export default async function InventoryPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/inventory");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          موجودی
        </h1>
        <p className="text-[var(--color-muted)]">
          تعدیل موجودی قفسه برای فروشگاه فعال
        </p>
      </header>
      <MerchantCatalogProviders>
        <InventoryClient />
      </MerchantCatalogProviders>
    </main>
  );
}
