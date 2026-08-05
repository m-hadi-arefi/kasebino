/**
 * ADR-104 / ADR-091 — external Navigate deep links (static map + navigate; no embed).
 * Prefer Neshan for Iranian merchants/customers.
 */

import { STORE_MAP_POLICY } from "../mvp-policies/index.js";

export type NavigateProvider = (typeof STORE_MAP_POLICY.navigateDeepLinks)[number];

export type NavigateLinks = {
  neshan: string;
  google: string;
  apple: string;
  geo: string;
};

export type NavigateLinkItem = {
  provider: NavigateProvider;
  href: string;
  labelFa: string;
};

export const NAVIGATE_LABELS_FA: Record<NavigateProvider, string> = {
  neshan: "مسیریابی با نشان",
  google: "مسیریابی با گوگل",
  apple: "مسیریابی با اپل",
  geo: "باز کردن در نقشه دستگاه",
};

export function buildNavigateLinks(input: {
  latitude: number;
  longitude: number;
  displayAddress?: string | null;
}): NavigateLinks {
  const lat = input.latitude;
  const lng = input.longitude;
  const label = encodeURIComponent(
    (input.displayAddress?.trim() || "مغازه").slice(0, 120),
  );
  return {
    neshan: `https://neshan.org/maps/@${lat},${lng},16z/routing/car/destination/${lat},${lng}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    apple: `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
    geo: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
  };
}

/** Prefer Neshan first for Iranian retail UX (ADR-104); policy enumerates allowed providers. */
const NAVIGATE_ORDER_FA_FIRST: readonly NavigateProvider[] = [
  "neshan",
  "google",
  "apple",
  "geo",
];

export function buildNavigateLinkItems(input: {
  latitude: number;
  longitude: number;
  displayAddress?: string | null;
}): NavigateLinkItem[] {
  const links = buildNavigateLinks(input);
  const allowed = new Set<string>(STORE_MAP_POLICY.navigateDeepLinks);
  return NAVIGATE_ORDER_FA_FIRST.filter((provider) => allowed.has(provider)).map(
    (provider) => ({
      provider,
      href: links[provider],
      labelFa: NAVIGATE_LABELS_FA[provider],
    }),
  );
}
