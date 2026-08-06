import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کالاها"
        description="مدیریت کالا، بارکد و قیمت به تومان"
      />
      <MerchantCatalogProviders>
        <ProductsListClient />
      </MerchantCatalogProviders>
    </div>
  );
}
