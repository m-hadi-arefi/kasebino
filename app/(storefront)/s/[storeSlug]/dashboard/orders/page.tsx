import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  customerLoginPath,
  isCustomerSession,
} from "@/infrastructure/auth/session-guard";

import { PortalProviders } from "../portal-providers";
import { PortalOrdersClient } from "./orders-client";

type OrdersPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: OrdersPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `سفارش‌های من «${storeSlug}» | کاسبینو`,
    description: "تاریخچهٔ سفارش‌های پیکاپ همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardOrdersPage({
  params,
}: OrdersPageProps) {
  const { storeSlug } = await params;
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const session = await auth();
  if (!isCustomerSession(session)) {
    redirect(customerLoginPath(storeSlug, `${base}/dashboard/orders`));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <PortalProviders>
        <PortalOrdersClient storeSlug={storeSlug} />
      </PortalProviders>
    </main>
  );
}
