import { NextResponse } from "next/server";
import {
  handleRealtimeTokenRequest,
  REALTIME_TOKEN_API,
  type RealtimeTokenAuthorizer,
} from "@/realtime-client";

/**
 * Short-lived MQTT client credentials — ADR-039 / ARD-015.
 * Merchant session resolution is injectable; defaults to unauthorized
 * until Auth.js session wiring is composed at the edge.
 */

function createRequestAuthorizer(
  _request: Request,
): RealtimeTokenAuthorizer {
  return {
    async resolveMerchantSession() {
      /** Session composition lands with merchant auth route middleware. */
      const merchantId = _request.headers.get("x-merchant-id");
      if (!merchantId?.trim()) {
        return null;
      }
      return { merchantId: merchantId.trim() };
    },
  };
}

export async function POST(request: Request) {
  const brokerUrlHint =
    process.env.MQTT_URL?.trim() || "mqtt://localhost:1883";
  const env = process.env.MOS_ENV?.trim() || process.env.NODE_ENV || "local";

  const result = await handleRealtimeTokenRequest(request, {
    authorizer: createRequestAuthorizer(request),
    env,
    brokerUrlHint,
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": REALTIME_TOKEN_API.cache,
    },
  });
}
