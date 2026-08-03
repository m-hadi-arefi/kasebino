import { NextResponse } from "next/server";
import {
  STORE_CUSTOMER_MANIFEST_CONTENT_TYPE,
  buildStoreCustomerManifest,
} from "@/store-customer-pwa";

type ManifestRouteProps = {
  params: Promise<{ storeSlug: string }>;
};

/**
 * Per-store Web App Manifest — ADR-023 / ARD-029.
 * start_url → this store's storefront; never staff POS paths.
 */
export async function GET(_request: Request, { params }: ManifestRouteProps) {
  const { storeSlug } = await params;
  const decoded = decodeURIComponent(storeSlug);

  const manifest = buildStoreCustomerManifest(decoded, {
    displayName: decoded,
    primaryColor: null,
  });

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": STORE_CUSTOMER_MANIFEST_CONTENT_TYPE,
      "Cache-Control": "public, max-age=600",
    },
  });
}
