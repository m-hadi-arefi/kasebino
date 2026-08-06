import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { CustomerProfileClient } from "../customer-profile-client";
import { MerchantCrmProviders } from "../crm-providers";

export const metadata: Metadata = {
  title: "پروفایل مشتری | کاسبینو",
  description: "هویت، آمار تعامل و تاریخچه خرید",
  robots: { index: false, follow: false },
};

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/customers");
  }
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="پروفایل مشتری"
        description="هویت، آمار تعامل و تاریخچه خرید · مبلغ به تومان"
        breadcrumbs={[
          { label: "مشتریان", href: "/customers" },
          { label: "پروفایل" },
        ]}
      />
      <MerchantCrmProviders>
        <CustomerProfileClient membershipId={id} />
      </MerchantCrmProviders>
    </div>
  );
}
