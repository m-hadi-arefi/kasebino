import { NextResponse } from "next/server";
import {
  STORE_CUSTOMER_MANIFEST_CONTENT_TYPE,
  buildStoreCustomerManifest,
  resolveStoreCustomerIconSrc,
} from "@/store-customer-pwa";
import { loadStorefrontProfile } from "@/modules/storefront/ui/load";

type ManifestRouteProps = {
  params: Promise<{ storeSlug: string }>;
};

/**
 * Per-store Web App Manifest — ADR-023 / ADR-105 / ARD-029.
 * start_url → this store's storefront; never staff POS paths.
 * Branding from live store settings (displayName / theme / icon when public).
 */
export async function GET(_request: Request, { params }: ManifestRouteProps) {
  const { storeSlug } = await params;
  const decoded = decodeURIComponent(storeSlug);

  const profile = await loadStorefrontProfile(decoded);
  const displayName =
    profile?.store.branding.displayName?.trim() || decoded;
  const primaryColor = profile?.store.branding.primaryColor ?? null;
  const iconSrc = resolveStoreCustomerIconSrc(
    profile?.store.branding.logoObjectKey,
    decoded,
  );

  const manifest = buildStoreCustomerManifest(decoded, {
    displayName,
    primaryColor,
    ...(iconSrc ? { iconSrc } : {}),
  });

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": STORE_CUSTOMER_MANIFEST_CONTENT_TYPE,
      "Cache-Control": "public, max-age=600",
    },
  });
}
