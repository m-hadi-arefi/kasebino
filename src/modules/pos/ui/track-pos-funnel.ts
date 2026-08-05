/**
 * Browser-safe POS funnel track (ADR-110 / PA-06).
 * Never import Mongo infrastructure into client components — posts HTTP beacon.
 */

import { csrfHeadersForBrowserFetch } from "@/infrastructure/security";

export type PosFunnelStep =
  | "pos_opened"
  | "capture_shown"
  | "capture_completed"
  | "checkout_completed";

/**
 * Fire a POS activation-funnel companion into product analytics via HTTP.
 * Failures are swallowed (ADR-065) — never throws into POS UI.
 */
export function trackPosFunnelStep(input: {
  step: PosFunnelStep;
  merchantId: string;
  storeId?: string | null;
  correlationId?: string;
}): void {
  try {
    if (!input.merchantId.trim()) return;
    void fetch("/api/v1/telemetry/product", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...csrfHeadersForBrowserFetch(),
      },
      body: JSON.stringify({
        step: input.step,
        merchantId: input.merchantId,
        storeId: input.storeId ?? null,
        ...(input.correlationId
          ? { correlationId: input.correlationId }
          : {}),
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* never block POS */
  }
}
