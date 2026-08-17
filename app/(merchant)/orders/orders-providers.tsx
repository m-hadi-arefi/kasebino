"use client";

import { useState, type ReactNode } from "react";

import {
  MerchantQueryProvider,
  createMerchantQueryClient,
} from "@/shared/contracts/data-fetching";

export function OrdersProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => createMerchantQueryClient());
  return (
    <MerchantQueryProvider client={client}>{children}</MerchantQueryProvider>
  );
}
