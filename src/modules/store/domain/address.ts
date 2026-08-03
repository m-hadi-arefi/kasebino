/**
 * Structured store address + WGS84 geo (ADR-006 / store-location-architecture).
 * Persian UTF-8 text fields for Iranian locations.
 */

export type StoreAddress = {
  readonly line1: string;
  readonly line2: string | null;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string | null;
  /** Human-readable label (often Persian). */
  readonly displayAddress: string;
  readonly latitude: number;
  readonly longitude: number;
};

export type StoreAddressInput = {
  line1: string;
  line2?: string | null;
  city: string;
  province: string;
  postalCode?: string | null;
  displayAddress?: string | null;
  latitude: number;
  longitude: number;
};

export function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function buildDisplayAddress(parts: {
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
}): string {
  return [parts.line1, parts.line2, parts.city, parts.province, parts.postalCode]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join("، ");
}
