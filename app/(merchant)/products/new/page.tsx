import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { MerchantCatalogProviders } from "../catalog-providers";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "افزودن کالا | کاسبینو",
  description: "ایجاد کالای جدید با بارکد و قیمت تومان",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/products/new");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          افزودن کالا
        </h1>
        <p className="text-[var(--color-muted)]">
          نام فارسی، بارکد، قیمت تومان و موجودی اولیه
        </p>
      </header>
      <MerchantCatalogProviders>
        <ProductForm />
      </MerchantCatalogProviders>
    </main>
  );
}
