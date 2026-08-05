import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { MerchantCatalogProviders } from "./catalog-providers";
import { ProductsListClient } from "./products-list-client";

export const metadata: Metadata = {
  title: "کالاها | کاسبینو",
  description: "مدیریت کالا و بارکد — قیمت به تومان",
  robots: { index: false, follow: false },
};

export default async function ProductsPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/products");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          کالاها
        </h1>
        <p className="text-[var(--color-muted)]">
          مدیریت کالا، بارکد و قیمت به تومان
        </p>
      </header>
      <MerchantCatalogProviders>
        <ProductsListClient />
      </MerchantCatalogProviders>
    </main>
  );
}
