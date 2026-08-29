import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { StoreHoursForm } from "./hours-form";

export const metadata: Metadata = {
  title: "ساعات کاری | کاسبینو",
  description: "ساعات کاری فروشگاه — شنبه تا جمعه",
  robots: { index: false, follow: false },
};

export default async function StoreHoursPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/stores");
  }
  const { id } = await params;
  return <StoreHoursForm storeId={id} />;
}
