import type { Metadata } from "next";
import { Suspense } from "react";

import { AUTH_UX_COPY_FA } from "@/infrastructure/auth/auth-ux-copy";

import { MerchantOtpLoginForm } from "./merchant-otp-login-form";

export const metadata: Metadata = {
  title: "ورود فروشنده | کاسبینو",
  description: "ورود با پیامک برای صاحب مغازه و کارکنان",
  robots: { index: false, follow: false },
};

export default function MerchantLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
          <p>{AUTH_UX_COPY_FA.loading}</p>
        </main>
      }
    >
      <MerchantOtpLoginForm />
    </Suspense>
  );
}
