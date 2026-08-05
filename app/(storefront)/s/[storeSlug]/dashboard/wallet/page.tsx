import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  customerLoginPath,
  isCustomerSession,
} from "@/infrastructure/auth/session-guard";

import { CustomerWalletClient } from "./wallet-client";
import { CustomerWalletProviders } from "./wallet-providers";

type WalletPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: WalletPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `کیف امتیاز «${storeSlug}» | کاسبینو`,
    description: "موجودی امتیاز وفاداری عضویت همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardWalletPage({
  params,
}: WalletPageProps) {
  const { storeSlug } = await params;
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const session = await auth();
  if (!isCustomerSession(session)) {
    redirect(customerLoginPath(storeSlug, `${base}/dashboard/wallet`));
  }

  return (
    <main
      lang="fa"
      dir="rtl"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6"
    >
      <p className="sr-only">
        کیف امتیاز همین فروشگاه · تومان · تاریخ شمسی تهران
      </p>
      <CustomerWalletProviders>
        <CustomerWalletClient storeSlug={storeSlug} />
      </CustomerWalletProviders>
    </main>
  );
}
