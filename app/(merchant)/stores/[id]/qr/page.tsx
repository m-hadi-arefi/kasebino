import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { StoreQrPrintClient } from "./qr-print-client";

export const metadata: Metadata = {
  title: "چاپ QR فروشگاه | کاسبینو",
  description: "برچسب QR ویترین فروشگاه",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StoreQrPrintPage({ params }: PageProps) {
  const session = await auth();
  if (!isMerchantSession(session)) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/stores/${encodeURIComponent(id)}/qr`);
  }
  const { id } = await params;
  return <StoreQrPrintClient storeId={id} />;
}
