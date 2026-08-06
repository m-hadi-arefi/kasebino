import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/composites/loading-state";
import { StorefrontChromeFromSlug } from "@/components/layout/storefront-chrome-from-slug";
import { AUTH_UX_COPY_FA } from "@/infrastructure/auth/auth-ux-copy";

import { CustomerOtpLoginForm } from "./customer-otp-login-form";

type PageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { storeSlug } = await params;
  return {
    title: `ورود مشتری «${storeSlug}» | کاسبینو`,
    description: "ورود با پیامک برای اعضای همین فروشگاه",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerLoginPage({ params }: PageProps) {
  const { storeSlug } = await params;
  return (
    <StorefrontChromeFromSlug storeSlug={storeSlug} mode="public">
      <Suspense fallback={<LoadingState rows={2} label={AUTH_UX_COPY_FA.loading} />}>
        <CustomerOtpLoginForm storeSlug={storeSlug} />
      </Suspense>
    </StorefrontChromeFromSlug>
  );
}
