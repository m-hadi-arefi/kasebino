import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  customerLoginPath,
  isCustomerSession,
} from "@/infrastructure/auth/session-guard";

import { PortalHomeClient } from "./portal-home-client";
import { PortalProviders } from "./portal-providers";

type DashboardPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: DashboardPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `پنل من «${storeSlug}» | کاسبینو`,
    description: "امتیاز، سفارش‌ها و رسیدهای عضویت همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardHomePage({
  params,
}: DashboardPageProps) {
  const { storeSlug } = await params;
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const session = await auth();
  if (!isCustomerSession(session)) {
    redirect(customerLoginPath(storeSlug, `${base}/dashboard`));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <PortalProviders>
        <PortalHomeClient storeSlug={storeSlug} />
      </PortalProviders>
    </main>
  );
}
