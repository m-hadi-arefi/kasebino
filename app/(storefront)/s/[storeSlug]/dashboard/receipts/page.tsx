import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  customerLoginPath,
  isCustomerSession,
} from "@/infrastructure/auth/session-guard";

import { PortalProviders } from "../portal-providers";
import { PortalReceiptsClient } from "./receipts-client";

type ReceiptsPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: ReceiptsPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `رسیدها «${storeSlug}» | کاسبینو`,
    description: "رسیدهای خرید عضویت همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardReceiptsPage({
  params,
}: ReceiptsPageProps) {
  const { storeSlug } = await params;
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const session = await auth();
  if (!isCustomerSession(session)) {
    redirect(customerLoginPath(storeSlug, `${base}/dashboard/receipts`));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <PortalProviders>
        <PortalReceiptsClient storeSlug={storeSlug} />
      </PortalProviders>
    </main>
  );
}
