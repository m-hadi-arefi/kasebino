import type { Metadata } from "next";
import { Suspense } from "react";

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
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
          <p>{AUTH_UX_COPY_FA.loading}</p>
        </main>
      }
    >
      <CustomerOtpLoginForm storeSlug={storeSlug} />
    </Suspense>
  );
}
