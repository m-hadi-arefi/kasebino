import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  const base = `/s/${encodeURIComponent(storeSlug)}`;

  return (
    <main
      lang="fa"
      dir="rtl"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6"
    >
      <header className="flex flex-col gap-2">
        <Link
          href={base}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {fa.backHome}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.checkoutTitle}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">{fa.checkoutSubtitle}</p>
      </header>

      <CheckoutProviders>
        <CheckoutClient
          storeSlug={storeSlug}
          storeId={profile.store.id}
          isAuthenticated={isCustomerSession(session)}
        />
      </CheckoutProviders>
    </main>
  );
}
