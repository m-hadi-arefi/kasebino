import { NextResponse } from "next/server";
import {
  STAFF_MANIFEST_CONTENT_TYPE,
  buildStaffManifest,
} from "@/modules/pos/ui/staff-pwa";

/**
 * Merchant staff Web App Manifest — ADR-022 / ARD-017.
 * MerchantOS branding; start_url → /pos; never store customer paths.
 */
export async function GET() {
  const manifest = buildStaffManifest();

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": STAFF_MANIFEST_CONTENT_TYPE,
      "Cache-Control": "public, max-age=600",
    },
  });
}
