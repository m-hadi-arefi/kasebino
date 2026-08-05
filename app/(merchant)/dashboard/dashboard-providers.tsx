"use client";

import { useState, type ReactNode } from "react";

import {
  MerchantQueryProvider,
  createMerchantQueryClient,
} from "@/data-fetching";

export function DashboardProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => createMerchantQueryClient());
  return (
    <MerchantQueryProvider client={client}>{children}</MerchantQueryProvider>
  );
}
