import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { MerchantCatalogProviders } from "../catalog-providers";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "ویرایش کالا | کاسبینو",
  description: "ویرایش کالا و حذف نرم از فهرست",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  if (!isMerchantSession(session)) {
    redirect(`/login?callbackUrl=/products/${id}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          ویرایش کالا
        </h1>
        <p className="text-[var(--color-muted)]">
          قیمت به تومان · حذف از فهرست بدون پاک کردن تاریخچه
        </p>
      </header>
      <MerchantCatalogProviders>
        <ProductForm productId={id} />
      </MerchantCatalogProviders>
    </main>
  );
}
