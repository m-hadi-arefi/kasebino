/**
 * Thin POS funnel track helper (ADR-110 / PA-06).
 * Best-effort — never throws into POS UI.
 */

import { randomUUID } from "node:crypto";

import { getMongoRuntime } from "./create-mongo-runtime.js";

export type PosFunnelStep =
  | "pos_opened"
  | "capture_shown"
  | "capture_completed"
  | "checkout_completed";

const STEP_EVENT: Record<
  PosFunnelStep,
  { eventType: string; featureKey: string }
> = {
  pos_opened: { eventType: "PosSessionStarted", featureKey: "pos.open" },
  capture_shown: {
    eventType: "CustomerCaptureShown",
    featureKey: "pos.customer_capture",
  },
  capture_completed: {
    eventType: "CustomerCaptureCompleted",
    featureKey: "pos.customer_capture",
  },
  checkout_completed: {
    eventType: "PosCheckoutCompleted",
    featureKey: "pos.checkout",
  },
};

/**
 * Fire a POS activation-funnel companion into product analytics.
 * Failures are swallowed (ADR-065).
 */
export function trackPosFunnelStep(input: {
  step: PosFunnelStep;
  merchantId: string;
  storeId?: string | null;
  correlationId?: string;
}): void {
  try {
    const meta = STEP_EVENT[input.step];
    const runtime = getMongoRuntime();
    runtime.trackProduct.trackEvent({
      eventId: randomUUID(),
      eventType: meta.eventType,
      merchantId: input.merchantId,
      storeId: input.storeId ?? null,
      featureKey: meta.featureKey,
      funnelId: "pos_phone_capture",
      stepKey: input.step,
      source: "pos",
      correlationId: input.correlationId ?? randomUUID(),
      properties: { surface: "merchant_pos" },
    });
    void runtime.flushBeacons().catch(() => undefined);
  } catch {
    /* never block POS */
  }
}
