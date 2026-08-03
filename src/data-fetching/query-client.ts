/**
 * QueryClient factory (ADR-026).
 * Provider wiring mounts this client under MerchantQueryProvider.
 */

import { QueryClient } from "@tanstack/react-query";
import { STALE_TIMES_MS } from "./stale-times.js";

/**
 * Default options — CRM-ish default; callers override staleTime per query
 * using {@link STALE_TIMES_MS} / surface helpers.
 */
export const DEFAULT_QUERY_CLIENT_OPTIONS = {
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES_MS.crm,
      /** Interactive UIs; avoid surprise refetch storms on shared tablets. */
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
} as const;

export function createMerchantQueryClient(
  overrides?: ConstructorParameters<typeof QueryClient>[0],
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...DEFAULT_QUERY_CLIENT_OPTIONS.defaultOptions.queries,
        ...overrides?.defaultOptions?.queries,
      },
      mutations: {
        ...DEFAULT_QUERY_CLIENT_OPTIONS.defaultOptions.mutations,
        ...overrides?.defaultOptions?.mutations,
      },
    },
    ...stripDefaultOptions(overrides),
  });
}

function stripDefaultOptions(
  overrides?: ConstructorParameters<typeof QueryClient>[0],
): Omit<NonNullable<ConstructorParameters<typeof QueryClient>[0]>, "defaultOptions"> | undefined {
  if (!overrides) {
    return undefined;
  }
  const rest: Record<string, unknown> = { ...overrides };
  delete rest.defaultOptions;
  return rest as Omit<
    NonNullable<ConstructorParameters<typeof QueryClient>[0]>,
    "defaultOptions"
  >;
}

/** Security — wipe server-state cache on merchant/staff logout (ADR-025/026). */
export function clearQueryCacheOnLogout(client: QueryClient): void {
  client.clear();
}
