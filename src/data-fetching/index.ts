/**
 * ADR-026 — Data Fetching Strategy.
 *
 * RSC where possible (dashboards/marketing); TanStack Query for interactive
 * POS/CRM client islands; Route Handlers for public/mobile JSON.
 * No ad-hoc fetch-in-useEffect. Stale times tuned per surface.
 */

import type { QueryClient } from "@tanstack/react-query";
import {
  PERSIAN_STATE_PLACEHOLDERS,
  STATE_IRANIAN_RULES,
} from "../state-management/index.js";
import { DEFAULT_QUERY_CLIENT_OPTIONS } from "./query-client.js";
import {
  assertNoTokenInQueryKey,
  buildScopedQueryKey,
  type QueryScope,
} from "./query-keys.js";
import { STALE_TIMES_MS, type FetchSurface } from "./stale-times.js";

export const DATA_FETCHING_LIBRARY = {
  clientServerState: "@tanstack/react-query",
  package: "@tanstack/react-query",
  installed: true,
  adr: "ADR-026",
} as const;

/**
 * Binding Decision (ADR-026).
 * RSC for read-heavy shells; Query for interactive; Route Handlers for JSON APIs.
 */
export const DATA_FETCHING_DECISION = {
  adr: "ADR-026",
  rscWherePossible: true,
  rscSurfaces: ["dashboard", "marketing"] as const,
  tanstackQuerySurfaces: ["pos", "crm"] as const,
  routeHandlerSurfaces: ["public_json", "mobile_json"] as const,
  avoidRscWaterfallsOnPos: true,
  noAdHocUseEffectFetch: true,
  staleTimesPerSurface: true,
  authOnFetches: true,
  trackSlowQueriesViaOtel: true,
  otelOwnedBy: "ADR-074",
  rationale: "rsc_plus_client_query_fits_next15",
} as const;

/** Filesystem placement. */
export const DATA_FETCHING_PATHS = {
  strategyRoot: "src/data-fetching",
  /** Module feature hooks live beside UI (not a global fetch soup). */
  moduleHooksGlob: "src/modules/*/ui/queries",
  providerStub: "src/data-fetching/provider.ts",
} as const;

/**
 * Choose fetch mode for a UI surface.
 * POS must not default to stacked RSC waterfalls.
 */
export type DataFetchMode = "rsc" | "tanstack_query" | "route_handler";

export function selectFetchMode(input: {
  surface: FetchSurface;
  interactiveClientIsland?: boolean;
}): DataFetchMode {
  if (
    input.surface === "public_json" ||
    input.surface === "mobile_json"
  ) {
    return "route_handler";
  }
  if (
    input.surface === "pos" ||
    input.surface === "crm" ||
    input.interactiveClientIsland === true
  ) {
    return "tanstack_query";
  }
  if (input.surface === "dashboard" || input.surface === "marketing") {
    return "rsc";
  }
  return "tanstack_query";
}

export const FORBIDDEN_FETCH_PATTERNS = [
  "ad_hoc_fetch_in_useEffect",
  "rsc_waterfall_on_pos",
  "client_only_spa_default",
  "tokens_in_query_keys",
  "mirror_server_lists_into_zustand",
  "duplicated_global_fetch_soup",
] as const;

export type ForbiddenFetchPattern =
  (typeof FORBIDDEN_FETCH_PATTERNS)[number];

export function isForbiddenFetchPattern(
  name: string,
): name is ForbiddenFetchPattern {
  return (FORBIDDEN_FETCH_PATTERNS as readonly string[]).includes(name);
}

export function assertNotForbiddenFetchPattern(name: string): void {
  if (isForbiddenFetchPattern(name)) {
    throw new Error(
      `Forbidden data-fetching pattern "${name}" (ADR-026). Prefer RSC where possible, TanStack Query for interactive POS/CRM, Route Handlers for JSON; never ad-hoc fetch in useEffect.`,
    );
  }
}

export function assertPosAvoidsRscWaterfall(options: {
  surface: FetchSurface;
  stackedRscFetches: boolean;
}): void {
  if (options.surface === "pos" && options.stackedRscFetches) {
    throw new Error(
      "Avoid RSC waterfalls on POS (ADR-026). Prefer a light client island + TanStack Query.",
    );
  }
}

export function assertAuthOnClientFetch(options: {
  requiresAuth: boolean;
  credentialsIncluded: boolean;
}): void {
  if (options.requiresAuth && !options.credentialsIncluded) {
    throw new Error(
      "Authenticated client fetches must include credentials / session (ADR-026 Security).",
    );
  }
}

/** Re-export Iranian placeholders (shared with ADR-025 state boundaries). */
export const PERSIAN_FETCH_PLACEHOLDERS = {
  loading: PERSIAN_STATE_PLACEHOLDERS.loading,
  empty: PERSIAN_STATE_PLACEHOLDERS.empty,
  error: PERSIAN_STATE_PLACEHOLDERS.error,
  dir: STATE_IRANIAN_RULES.dir,
  lang: STATE_IRANIAN_RULES.lang,
  locale: STATE_IRANIAN_RULES.locale,
  noEnglishPlaceholderFlash:
    STATE_IRANIAN_RULES.noEnglishPlaceholderFlash,
  preserveUnicodePersianPayloads:
    STATE_IRANIAN_RULES.preserveUnicodePersianPayloads,
} as const;

export function assertPersianPayloadPreservedInCache(
  original: string,
  cached: string,
): void {
  if (original !== cached) {
    throw new Error(
      "Cached display state must preserve Unicode Persian payloads (ADR-026 Iranian First).",
    );
  }
  if (!PERSIAN_FETCH_PLACEHOLDERS.preserveUnicodePersianPayloads) {
    throw new Error("Persian Unicode preservation flag must stay enabled.");
  }
}

/**
 * Seed + read a sample cached Persian payload through TanStack QueryClient.
 * Proves install + Unicode round-trip without network.
 */
export async function cachePersianPayload(
  client: QueryClient,
  scope: QueryScope,
  entity: string,
  payload: { title: string },
): Promise<{ title: string }> {
  assertNoTokenInQueryKey([payload.title]);
  const key = buildScopedQueryKey(scope, entity);
  client.setQueryData(key, payload);
  const cached = client.getQueryData<{ title: string }>(key);
  if (!cached) {
    throw new Error("Expected query cache entry after setQueryData.");
  }
  assertPersianPayloadPreservedInCache(payload.title, cached.title);
  return cached;
}

export const DATA_FETCHING_STRATEGY = {
  decision: DATA_FETCHING_DECISION,
  library: DATA_FETCHING_LIBRARY,
  paths: DATA_FETCHING_PATHS,
  staleTimesMs: STALE_TIMES_MS,
  defaultQueryClientOptions: DEFAULT_QUERY_CLIENT_OPTIONS,
  forbidden: FORBIDDEN_FETCH_PATTERNS,
  placeholders: PERSIAN_FETCH_PLACEHOLDERS,
} as const;

export {
  STALE_TIMES_MS,
  staleTimeForSurface,
  type FetchSurface,
} from "./stale-times.js";

export {
  createMerchantQueryClient,
  clearQueryCacheOnLogout,
  DEFAULT_QUERY_CLIENT_OPTIONS,
} from "./query-client.js";

export {
  MerchantQueryProvider,
  type MerchantQueryProviderProps,
} from "./provider.js";

export {
  assertNoTokenInQueryKey,
  buildScopedQueryKey,
  type QueryScope,
} from "./query-keys.js";

export type { QueryClient };
