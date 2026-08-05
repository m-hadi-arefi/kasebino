import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isMerchantSession } from "@/infrastructure/auth/session-guard";

import { CreateStoreClient } from "./create-store-client";

export const metadata: Metadata = {
  title: "فروشگاه جدید | کاسبینو",
  robots: { index: false, follow: false },
};

export default async function NewStorePage() {
  const session = await auth();
  if (!isMerchantSession(session)) {
    redirect("/login?callbackUrl=/stores/new");
  }
  return <CreateStoreClient />;
}
