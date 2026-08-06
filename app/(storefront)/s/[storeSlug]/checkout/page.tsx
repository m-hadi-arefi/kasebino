import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/composites/page-header";
import { StorefrontChrome } from "@/components/layout/storefront-chrome";
import { auth } from "@/auth";
import { isCustomerSession } from "@/infrastructure/auth/session-guard";
import { STOREFRONT_UI_COPY_FA } from "@/modules/storefront/ui";
import { loadStorefrontProfile } from "@/modules/storefront/ui/load";

import { CheckoutClient } from "./checkout-client";
import { CheckoutProviders } from "./checkout-providers";

const fa = STOREFRONT_UI_COPY_FA;

type CheckoutPageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `تسویه سفارش حضوری «${storeSlug}» | کاسبینو`,
    description: "سفارش فقط به‌صورت حضوری (پیکاپ) — بدون ارسال پیک",
    robots: { index: false, follow: false },
  };
}

export default async function StorefrontCheckoutPage({
  params,
}: CheckoutPageProps) {
  const { storeSlug } = await params;
  const profile = await loadStorefrontProfile(storeSlug);
  if (!profile) notFound();

  const session = await auth();
  const store = profile.store;
  const base = `/s/${encodeURIComponent(storeSlug)}`;

  return (
    <StorefrontChrome
      storeSlug={storeSlug}
      storeName={store.branding.displayName}
      primaryColor={store.branding.primaryColor}
      mode="public"
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          title={fa.checkoutTitle}
          description={fa.checkoutSubtitle}
          breadcrumbs={[
            { label: fa.backHome, href: base },
            { label: fa.checkoutTitle },
          ]}
        />

        <CheckoutProviders>
          <CheckoutClient
            storeSlug={storeSlug}
            storeId={store.id}
            isAuthenticated={isCustomerSession(session)}
          />
        </CheckoutProviders>
      </div>
    </StorefrontChrome>
  );
}
