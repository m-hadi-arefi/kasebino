/**
 * ADR-104 — Public storefront map/nav DTO builder (LOC-02).
 */

import {
  isValidLatitude,
  isValidLongitude,
} from "../address.js";
import {
  buildNavigateLinkItems,
  buildNavigateLinks,
  type NavigateLinkItem,
  type NavigateLinks,
} from "./navigate.js";
import {
  createEnvStaticMapProvider,
  readStaticMapEnvFromProcess,
  type StaticMapProvider,
} from "./static-map-provider.js";

export type PublicStoreMapDto = {
  available: boolean;
  /** Same-origin proxy path when provider configured; null for address-only fallback. */
  staticImagePath: string | null;
  fallbackReason: "none" | "provider_unconfigured" | "invalid_geo";
  latitude: number;
  longitude: number;
  navigate: NavigateLinks;
  navigateItems: NavigateLinkItem[];
};

export type BuildPublicStoreMapInput = {
  storeSlug: string;
  latitude: number;
  longitude: number;
  displayAddress?: string | null;
  provider?: StaticMapProvider;
};

export function buildPublicStoreMapDto(
  input: BuildPublicStoreMapInput,
): PublicStoreMapDto {
  const provider =
    input.provider ??
    createEnvStaticMapProvider(readStaticMapEnvFromProcess());
  const navigate = buildNavigateLinks({
    latitude: input.latitude,
    longitude: input.longitude,
    ...(input.displayAddress !== undefined
      ? { displayAddress: input.displayAddress }
      : {}),
  });
  const navigateItems = buildNavigateLinkItems({
    latitude: input.latitude,
    longitude: input.longitude,
    ...(input.displayAddress !== undefined
      ? { displayAddress: input.displayAddress }
      : {}),
  });

  if (!isValidLatitude(input.latitude) || !isValidLongitude(input.longitude)) {
    return {
      available: false,
      staticImagePath: null,
      fallbackReason: "invalid_geo",
      latitude: input.latitude,
      longitude: input.longitude,
      navigate,
      navigateItems,
    };
  }

  const upstream = provider.buildUrl({
    latitude: input.latitude,
    longitude: input.longitude,
  });
  if (!upstream) {
    return {
      available: false,
      staticImagePath: null,
      fallbackReason: "provider_unconfigured",
      latitude: input.latitude,
      longitude: input.longitude,
      navigate,
      navigateItems,
    };
  }

  return {
    available: true,
    staticImagePath: `/api/v1/storefront/${encodeURIComponent(input.storeSlug)}/static-map`,
    fallbackReason: "none",
    latitude: input.latitude,
    longitude: input.longitude,
    navigate,
    navigateItems,
  };
}

export {
  NAVIGATE_LABELS_FA,
  buildNavigateLinkItems,
  buildNavigateLinks,
  type NavigateLinkItem,
  type NavigateLinks,
  type NavigateProvider,
} from "./navigate.js";
export {
  createEnvStaticMapProvider,
  createNeshanStaticMapProvider,
  createTemplateStaticMapProvider,
  readStaticMapEnvFromProcess,
  type StaticMapEnv,
  type StaticMapProvider,
  type StaticMapRequest,
} from "./static-map-provider.js";
