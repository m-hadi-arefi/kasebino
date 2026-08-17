/**
 * ADR-025 — State Management Strategy.
 *
 * Clear ownership: server state → fetching lib (TanStack Query / ADR-026);
 * client UI → local React state / Context; POS cart → Zustand;
 * list filters / deep links → URL search params. Redux is not mandated.
 */

/** Libraries chosen for client ephemeral state (not server truth). */
export const CLIENT_STATE_LIBRARIES = {
  /** POS cart + short-lived UI slices that cross a few components. */
  posCartAndEphemeral: "zustand",
  /** Prefer these before introducing a store. */
  localUi: ["useState", "useReducer"] as const,
  crossTreeUi: "react_context",
} as const;

/**
 * Server-state ownership — TanStack Query via `src/shared/contracts/data-fetching` (ADR-026).
 * Never mirror API lists into Zustand as the source of truth.
 */
export const SERVER_STATE_OWNERSHIP = {
  owner: "tanstack_query" as const,
  implementedInAdr: "ADR-026",
  /** Wiring landed in `src/shared/contracts/data-fetching` (ADR-026). */
  installDeferredToAdr026: false,
  invalidateOnRealtimeEvents: true,
  clearQueryCacheOnLogout: true,
  forbidMirrorIntoZustand: true,
} as const;

/** URL owns shareable filter / deep-link state. */
export const URL_STATE_OWNERSHIP = {
  owner: "url_search_params" as const,
  useFor: ["filters", "sort", "pagination", "deep_links"] as const,
  preservePersianUnicode: true,
} as const;

/**
 * Binding Decision (ADR-025).
 * Two libraries is intentional; Redux-everywhere is rejected.
 */
export const STATE_MANAGEMENT_DECISION = {
  adr: "ADR-025",
  serverState: SERVER_STATE_OWNERSHIP.owner,
  serverStateViaFetchingLib: true,
  clientUiState: "local_or_context" as const,
  posCart: "zustand_client" as const,
  filterState: URL_STATE_OWNERSHIP.owner,
  reduxMandated: false,
  rationale: "clear_server_vs_client_separation",
} as const;

/** Filesystem placement. */
export const STATE_MANAGEMENT_PATHS = {
  strategyRoot: "src/shared/state",
  /** Module-owned POS UI cart store (docs/tech/zustand.md). */
  posCartUiState: "src/modules/pos/ui/state",
  /** TanStack QueryClient / provider stub (ADR-026). */
  sharedQuery: "src/shared/contracts/data-fetching",
} as const;

/**
 * Forbidden defaults — Redux is not the platform mandate;
 * mega domains stores and server mirroring are anti-patterns.
 */
export const FORBIDDEN_STATE_PATTERNS = [
  "redux_as_default_architecture",
  "mirror_server_lists_into_zustand",
  "mega_store_across_bounded_contexts",
  "fetching_inside_zustand",
  "tokens_in_client_state_keys",
] as const;

export type ForbiddenStatePattern =
  (typeof FORBIDDEN_STATE_PATTERNS)[number];

/** Security: wipe ephemeral client + server query caches on logout. */
export const LOGOUT_STATE_CLEAR = {
  clearPosCart: true,
  clearEphemeralUiStores: true,
  clearTanStackQueryCache: true,
  queryCacheClearOwnedBy: "ADR-026",
} as const;

/**
 * Iranian First — display / cart state must not corrupt Persian or flash EN.
 * Suspense/error chrome is Persian RTL until ADR-028 lands full error UX.
 */
export const STATE_IRANIAN_RULES = {
  preserveUnicodePersianPayloads: true,
  suspenseErrorUiPersianRtl: true,
  lang: "fa" as const,
  dir: "rtl" as const,
  locale: "fa-IR" as const,
  noEnglishPlaceholderFlash: true,
  preferSnappyMobileCart: true,
  /** Money stays integer minor units in cart; تومان formatting is presentation. */
  moneyMinorUnitsInCart: true,
  displayCurrencyUnit: "تومان" as const,
} as const;

/**
 * Persian RTL placeholders — avoid English flashes during SWR / suspense.
 * Full error UX = ADR-028; these are capacity strings for state boundaries.
 */
export const PERSIAN_STATE_PLACEHOLDERS = {
  loading: "در حال بارگذاری…",
  empty: "موردی یافت نشد",
  error: "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  cartEmpty: "سبد خرید خالی است",
  dir: STATE_IRANIAN_RULES.dir,
  lang: STATE_IRANIAN_RULES.lang,
} as const;

export type StateOwnerKind =
  | "server_fetching_lib"
  | "local_ui"
  | "react_context"
  | "zustand_pos_cart"
  | "url_filters";

/** Classify intended owner for a piece of frontend state. */
export function classifyStateOwner(input: {
  isServerData: boolean;
  isPosCart: boolean;
  isFilterOrDeepLink: boolean;
  crossesDistantTree?: boolean;
}): StateOwnerKind {
  if (input.isServerData) {
    return "server_fetching_lib";
  }
  if (input.isPosCart) {
    return "zustand_pos_cart";
  }
  if (input.isFilterOrDeepLink) {
    return "url_filters";
  }
  if (input.crossesDistantTree) {
    return "react_context";
  }
  return "local_ui";
}

export function isForbiddenStatePattern(
  name: string,
): name is ForbiddenStatePattern {
  return (FORBIDDEN_STATE_PATTERNS as readonly string[]).includes(name);
}

export function assertNotForbiddenStatePattern(name: string): void {
  if (isForbiddenStatePattern(name)) {
    throw new Error(
      `Forbidden state pattern "${name}" (ADR-025). Use TanStack Query for server state, Zustand only for POS/ephemeral UI, URL for filters.`,
    );
  }
}

export function assertServerStateNotInZustand(options: {
  mirrorsServerList: boolean;
}): void {
  if (options.mirrorsServerList) {
    throw new Error(
      "Do not mirror server lists into Zustand (ADR-025). Server state belongs to the fetching library (ADR-026 TanStack Query).",
    );
  }
}

export function assertReduxNotMandated(): void {
  if (STATE_MANAGEMENT_DECISION.reduxMandated) {
    throw new Error("Redux must not be mandated (ADR-025).");
  }
}

/** Preserve UTF-8 Persian in any client-held display string. */
export function assertPersianPayloadPreserved(
  original: string,
  stored: string,
): void {
  if (original !== stored) {
    throw new Error(
      "Cached display state must preserve Unicode Persian payloads (ADR-025 Iranian First).",
    );
  }
  if (!STATE_IRANIAN_RULES.preserveUnicodePersianPayloads) {
    throw new Error("Persian Unicode preservation flag must stay enabled.");
  }
}

export {
  parseFilterSearchParams,
  serializeFilterSearchParams,
  type FilterState,
} from "./url-filter-state.js";

export {
  createPosCartStore,
  type PosCartLine,
  type PosCartState,
  type PosCartStore,
} from "./pos-cart-store.js";

export const STATE_MANAGEMENT_STRATEGY = {
  decision: STATE_MANAGEMENT_DECISION,
  clientLibraries: CLIENT_STATE_LIBRARIES,
  serverOwnership: SERVER_STATE_OWNERSHIP,
  urlOwnership: URL_STATE_OWNERSHIP,
  paths: STATE_MANAGEMENT_PATHS,
  forbidden: FORBIDDEN_STATE_PATTERNS,
  logoutClear: LOGOUT_STATE_CLEAR,
  iranian: STATE_IRANIAN_RULES,
  placeholders: PERSIAN_STATE_PLACEHOLDERS,
} as const;
