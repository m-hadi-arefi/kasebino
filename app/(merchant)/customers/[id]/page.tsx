import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          پروفایل مشتری
        </h1>
        <p className="text-[var(--color-muted)]">
          هویت، آمار تعامل و تاریخچه خرید · مبلغ به تومان
        </p>
      </header>
      <MerchantCrmProviders>
        <CustomerProfileClient membershipId={id} />
      </MerchantCrmProviders>
    </main>
  );
}
