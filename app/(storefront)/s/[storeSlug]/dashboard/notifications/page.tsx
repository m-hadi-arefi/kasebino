import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StorefrontChromeFromSlug } from "@/components/layout/storefront-chrome-from-slug";
import { auth } from "@/auth";
import {
  customerLoginPath,
  isCustomerSession,
} from "@/infrastructure/auth/session-guard";

import { PortalProviders } from "../portal-providers";
import { CustomerNotificationsClient } from "./notifications-client";

type NotificationsPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: NotificationsPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `اعلان‌ها «${storeSlug}» | کاسبینو`,
    description: "اعلان‌های عضویت همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDashboardNotificationsPage({
  params,
}: NotificationsPageProps) {
  const { storeSlug } = await params;
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const session = await auth();
  if (!isCustomerSession(session)) {
    redirect(customerLoginPath(storeSlug, `${base}/dashboard/notifications`));
  }

  return (
    <StorefrontChromeFromSlug storeSlug={storeSlug} mode="portal">
      <PortalProviders>
        <CustomerNotificationsClient storeSlug={storeSlug} />
      </PortalProviders>
    </StorefrontChromeFromSlug>
  );
}
