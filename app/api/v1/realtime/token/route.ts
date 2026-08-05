import { NextResponse } from "next/server";

import {
  handleRealtimeTokenRequest,
  parseRealtimeTokenBody,
  REALTIME_TOKEN_API,
  type RealtimeTokenAuthorizer,
} from "@/realtime-client";
import { auth } from "@/auth";
import {
  merchantIdFromSession,
  parseActiveStoreCookie,
  type AuthSessionSnapshot,
} from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";

/**
 * Short-lived MQTT client credentials — ADR-039 / ADR-095 / ADR-119 / ADR-124.
 * Requires authenticated merchant JWT session + owned active store.
 * Never trusts `x-merchant-id` (or any client identity header) as auth.
 */

function createSessionAuthorizer(
  session: AuthSessionSnapshot,
): RealtimeTokenAuthorizer {
  return {
    async resolveMerchantSession() {
      // Explicitly session-only — identity headers are ignored (ADR-119).
      const merchantId = merchantIdFromSession(session);
      if (!merchantId) {
        return null;
      }
      return { merchantId };
    },
  };
}

export async function POST(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  const brokerUrlHint =
    process.env.MQTT_URL?.trim() || "mqtt://localhost:1883";
  const env = process.env.MOS_ENV?.trim() || process.env.NODE_ENV || "local";
  const cookieStoreId = parseActiveStoreCookie(request.headers.get("cookie"));

  let requestedStoreId: string | null = null;
  try {
    const json: unknown = await request.json();
    requestedStoreId = parseRealtimeTokenBody(json).storeId;
  } catch {
    requestedStoreId = null;
  }

  const ctx = getApiContext();

  const result = await handleRealtimeTokenRequest(request, {
    authorizer: createSessionAuthorizer(session),
    env,
    brokerUrlHint,
    requestedStoreId,
    cookieStoreId,
    async resolveOwnedStore({
      merchantId,
      requestedStoreId: reqId,
      cookieStoreId: cookieId,
    }) {
      const stores = await ctx.repos.stores.listByMerchantId(merchantId);
      if (stores.length === 0) {
        return { status: "missing" as const };
      }

      const preferred = reqId || cookieId;
      if (!preferred) {
        const first = stores[0];
        if (!first) return { status: "missing" as const };
        return { status: "ok" as const, storeId: first.id };
      }

      const owned = stores.find((s) => s.id === preferred);
      if (owned) {
        return { status: "ok" as const, storeId: owned.id };
      }

      // Store exists under another merchant → cross-store deny.
      return { status: "forbidden" as const };
    },
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": REALTIME_TOKEN_API.cache,
    },
  });
}
