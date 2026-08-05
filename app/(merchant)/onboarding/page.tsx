import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { OnboardingWizardClient } from "./onboarding-wizard-client";

export const metadata: Metadata = {
  title: "راه‌اندازی کسب‌وکار | کاسبینو",
  description: "ثبت کسب‌وکار، فروشگاه و برند ویترین",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/onboarding");
  }

  return <OnboardingWizardClient />;
}
