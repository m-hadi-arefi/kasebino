import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ویرایش کالا"
        description="قیمت به تومان · حذف از فهرست بدون پاک کردن تاریخچه"
        breadcrumbs={[
          { label: "کالاها", href: "/products" },
          { label: "ویرایش کالا" },
        ]}
      />
      <MerchantCatalogProviders>
        <ProductForm productId={id} />
      </MerchantCatalogProviders>
    </div>
  );
}
