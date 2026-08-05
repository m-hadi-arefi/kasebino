import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { StoreLocationForm } from "./location-form";

export const metadata: Metadata = {
  title: "موقعیت فروشگاه | کاسبینو",
  description: "آدرس و مختصات جغرافیایی فروشگاه",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StoreLocationPage({ params }: PageProps) {
  const session = await auth();
  if (!isMerchantSession(session)) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/stores/${encodeURIComponent(id)}/location`);
  }
  const { id } = await params;
  return <StoreLocationForm storeId={id} />;
}
