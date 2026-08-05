import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { StoresIndexClient } from "./stores-index-client";

export const metadata: Metadata = {
  title: "فروشگاه‌ها | کاسبینو",
  description: "موقعیت و QR فروشگاه‌ها",
  robots: { index: false, follow: false },
};

export default async function StoresIndexPage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/stores");
  }
  return <StoresIndexClient />;
}
