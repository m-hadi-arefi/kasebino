/**
 * Store branding hooks (ADR-006). Logo binary → MinIO later.
 */

export type StoreBranding = {
  /** Persian-capable storefront display name. */
  displayName: string;
  /** MinIO object key for logo (null until uploaded). */
  logoObjectKey: string | null;
  /** Optional CSS hex accent for storefront/PWA chrome. */
  primaryColor: string | null;
};

export const DEFAULT_BRANDING_COLOR = null;

export type StoreBrandingInput = {
  displayName: string;
  logoObjectKey?: string | null;
  primaryColor?: string | null;
};
