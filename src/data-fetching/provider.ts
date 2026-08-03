/**
 * QueryClientProvider stub (ADR-026).
 * Contracts tsconfig is `.ts`-only — use createElement (no JSX).
 * App shells mount this under a client boundary when POS/CRM UI lands.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";

export type MerchantQueryProviderProps = {
  client: QueryClient;
  children: ReactNode;
};

/**
 * Thin provider stub — pass a stable client from `createMerchantQueryClient`
 * (typically created once in a client layout / providers module).
 */
export function MerchantQueryProvider(
  props: MerchantQueryProviderProps,
): ReactNode {
  return createElement(
    QueryClientProvider,
    { client: props.client },
    props.children,
  );
}
