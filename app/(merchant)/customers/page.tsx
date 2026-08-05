import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { CustomersListClient } from "./customers-list-client";
import { MerchantCrmProviders } from "./crm-providers";

export const metadata: Metadata = {
  title: "مشتریان | کاسبینو",
  description: "اعضای مغازه — شماره موبایل ایرانی",
  robots: { index: false, follow: false },
};

export default async function CustomersPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/customers");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          مشتریان
        </h1>
        <p className="text-[var(--color-muted)]">
          اعضای مغازه — شماره موبایل ایرانی · مبلغ به تومان · تاریخ شمسی
        </p>
      </header>
      <MerchantCrmProviders>
        <CustomersListClient />
      </MerchantCrmProviders>
    </main>
  );
}
