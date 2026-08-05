import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  customerLoginPath,
  isCustomerSession,
} from "@/infrastructure/auth/session-guard";

import { PortalProviders } from "../portal-providers";
import { PortalRewardsClient } from "./rewards-client";

type RewardsPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: RewardsPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `جایزه‌ها «${storeSlug}» | کاسبینو`,
    description: "جایزه‌های وفاداری عضویت همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardRewardsPage({
  params,
}: RewardsPageProps) {
  const { storeSlug } = await params;
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const session = await auth();
  if (!isCustomerSession(session)) {
    redirect(customerLoginPath(storeSlug, `${base}/dashboard/rewards`));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <PortalProviders>
        <PortalRewardsClient storeSlug={storeSlug} />
      </PortalProviders>
    </main>
  );
}
