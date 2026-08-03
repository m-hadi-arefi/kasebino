/**
 * Per-surface staleTime defaults (ADR-026 / docs/tech/tanstack-query.md).
 * POS stays shorter for snappy Iranian mobile checkout perception.
 */

export type FetchSurface =
  | "dashboard"
  | "marketing"
  | "crm"
  | "pos"
  | "pos_product_search"
  | "public_json"
  | "mobile_json";

/** Milliseconds. */
export const STALE_TIMES_MS = {
  /** Merchant OLTP dashboards — RSC primary; Query when client island. */
  dashboard: 60_000,
  /** Marketing / storefront marketing chrome. */
  marketing: 300_000,
  /** CRM member lists / interactive tables. */
  crm: 30_000,
  /** POS catalog / stock snapshots — short. */
  pos: 10_000,
  /** Barcode / product search on POS — shortest interactive stale. */
  pos_product_search: 5_000,
  /** Public JSON via Route Handlers — browser/CDN may also cache. */
  public_json: 60_000,
  /** Mobile / store PWA JSON. */
  mobile_json: 30_000,
} as const satisfies Record<FetchSurface, number>;

export function staleTimeForSurface(surface: FetchSurface): number {
  return STALE_TIMES_MS[surface];
}
