import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="موجودی"
        description="تعدیل موجودی قفسه برای فروشگاه فعال"
      />
      <MerchantCatalogProviders>
        <InventoryClient />
      </MerchantCatalogProviders>
    </div>
  );
}
