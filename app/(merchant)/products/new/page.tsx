import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="افزودن کالا"
        description="نام فارسی، بارکد، قیمت تومان و موجودی اولیه"
        breadcrumbs={[
          { label: "کالاها", href: "/products" },
          { label: "افزودن کالا" },
        ]}
      />
      <MerchantCatalogProviders>
        <ProductForm />
      </MerchantCatalogProviders>
    </div>
  );
}
