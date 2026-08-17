/**
 * ADR-110 — HTTP telemetry beacons (clickstream + session).
 * Best-effort: Mongo outages never 5xx the beacon for track class.
 */

import { z } from "zod";
import { randomUUID } from "node:crypto";

import {
  CLICKSTREAM_BEACON,
  CLICKSTREAM_UX_FA,
  type BeaconBatchItem,
} from "../../mongodb/clickstream/index.js";
import type { MongoRuntime } from "../../mongodb/create-mongo-runtime.js";
import {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
  parseBody,
} from "../envelopes.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

/** Soft payload size guard (bytes of raw JSON text approx via stringified body). */
export const TELEMETRY_MAX_PAYLOAD_BYTES = 64 * 1024;

export const TELEMETRY_UX_FA = {
  locale: "fa-IR" as const,
  dir: "rtl" as const,
  OVERSIZED: "حجم داده‌های ردیابی بیش از حد مجاز است.",
  INVALID: "درخواست ردیابی نامعتبر است.",
  ACCEPTED: "رویدادها با موفقیت دریافت شد.",
} as const;

const beaconItemSchema = z.object({
  eventId: z.string().min(1).optional(),
  eventType: z.string().min(1),
  merchantId: z.string().min(1),
  storeId: z.string().nullable().optional(),
  actorId: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  anonymousId: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  referrer: z.string().nullable().optional(),
  viewportClass: z
    .enum(["mobile", "desktop", "tablet", "unknown"])
    .optional(),
  funnelCritical: z.boolean().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().optional(),
  correlationId: z.string().optional(),
  source: z.string().optional(),
  schemaVersion: z.number().int().positive().optional(),
});

const beaconBodySchema = z.object({
  events: z.array(beaconItemSchema).min(1).max(CLICKSTREAM_BEACON.maxBatchSize),
});

const sessionBodySchema = z.object({
  eventId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  action: z.enum(["start", "heartbeat", "end"]),
  merchantId: z.string().min(1),
  storeId: z.string().nullable().optional(),
  actorId: z.string().nullable().optional(),
  anonymousId: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  deviceClass: z
    .enum(["mobile", "desktop", "tablet", "unknown"])
    .optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().optional(),
  correlationId: z.string().optional(),
  source: z.string().optional(),
  schemaVersion: z.number().int().positive().optional(),
});

async function rejectIfOversized(
  request: HttpRequestLike,
  correlationId: string,
): Promise<HttpHandlerResult | null> {
  const raw = request.headers.get("content-length");
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > TELEMETRY_MAX_PAYLOAD_BYTES) {
      return fail({
        code: "TELEMETRY_PAYLOAD_TOO_LARGE",
        correlationId,
        status: 413,
        messageFa: TELEMETRY_UX_FA.OVERSIZED,
      });
    }
  }
  return null;
}

export async function handleTelemetryBeacon(
  request: HttpRequestLike,
  runtime: MongoRuntime,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const oversized = await rejectIfOversized(request, correlationId);
  if (oversized) return oversized;

  const parsed = await parseBody(request, beaconBodySchema, correlationId);
  if (!parsed.ok) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: TELEMETRY_UX_FA.INVALID,
    });
  }

  const items: BeaconBatchItem[] = parsed.data.events.map((e) => ({
    eventId: e.eventId ?? randomUUID(),
    eventType: e.eventType,
    merchantId: e.merchantId,
    storeId: e.storeId ?? null,
    actorId: e.actorId ?? null,
    sessionId: e.sessionId ?? null,
    anonymousId: e.anonymousId ?? null,
    path: e.path ?? null,
    referrer: e.referrer ?? null,
    ...(e.viewportClass ? { viewportClass: e.viewportClass } : {}),
    ...(e.funnelCritical !== undefined
      ? { funnelCritical: e.funnelCritical }
      : {}),
    properties: e.properties ?? {},
    ...(e.occurredAt ? { occurredAt: e.occurredAt } : {}),
    correlationId: e.correlationId ?? correlationId,
    source: e.source ?? "storefront",
    ...(e.schemaVersion !== undefined
      ? { schemaVersion: e.schemaVersion }
      : {}),
  }));

  const batch = runtime.trackClickstream.ingestBeaconBatch(items);
  // Best-effort flush; swallow Mongo errors (ADR-065 / ADR-110).
  try {
    await runtime.flushBeacons();
  } catch {
    /* fail-open */
  }

  return ok(
    {
      accepted: batch.accepted,
      sampledOut: batch.sampledOut,
      rejected: batch.rejected,
      hintFa: CLICKSTREAM_UX_FA.CLICKS_TITLE,
    },
    { status: 202 },
  );
}

export async function handleTelemetrySession(
  request: HttpRequestLike,
  runtime: MongoRuntime,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const oversized = await rejectIfOversized(request, correlationId);
  if (oversized) return oversized;

  const parsed = await parseBody(request, sessionBodySchema, correlationId);
  if (!parsed.ok) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: TELEMETRY_UX_FA.INVALID,
    });
  }

  const body = parsed.data;
  const result = runtime.trackSession.trackSession({
    eventId: body.eventId ?? randomUUID(),
    sessionId: body.sessionId,
    action: body.action,
    merchantId: body.merchantId,
    storeId: body.storeId ?? null,
    actorId: body.actorId ?? null,
    anonymousId: body.anonymousId ?? null,
    path: body.path ?? null,
    ...(body.deviceClass ? { deviceClass: body.deviceClass } : {}),
    properties: body.properties ?? {},
    ...(body.occurredAt ? { occurredAt: body.occurredAt } : {}),
    correlationId: body.correlationId ?? correlationId,
    source: body.source ?? "storefront",
    ...(body.schemaVersion !== undefined
      ? { schemaVersion: body.schemaVersion }
      : {}),
  });

  try {
    await runtime.flushBeacons();
  } catch {
    /* fail-open */
  }

  return ok(
    {
      status: result.status,
      eventId: result.eventId,
      sessionId: result.sessionId,
      ...(result.status === "accepted"
        ? { sessionStatus: result.sessionStatus }
        : { reason: result.reason }),
    },
    { status: 202 },
  );
}

const posFunnelStepSchema = z.enum([
  "pos_opened",
  "capture_shown",
  "capture_completed",
  "checkout_completed",
]);

const productFunnelBodySchema = z.object({
  step: posFunnelStepSchema,
  merchantId: z.string().min(1),
  storeId: z.string().nullable().optional(),
  correlationId: z.string().optional(),
});

/**
 * POS/product funnel beacon — browser clients must not import Mongo driver.
 * Best-effort: always 202 even when validation/runtime fails soft paths.
 */
export async function handleTelemetryProductFunnel(
  request: HttpRequestLike,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  if (request.method.toUpperCase() !== "POST") {
    return methodNotAllowed(correlationId, "POST");
  }
  const oversized = await rejectIfOversized(request, correlationId);
  if (oversized) return oversized;

  const parsed = await parseBody(request, productFunnelBodySchema, correlationId);
  if (!parsed.ok) {
    return fail({
      code: "VALIDATION_ERROR",
      correlationId,
      status: 400,
      messageFa: TELEMETRY_UX_FA.INVALID,
    });
  }

  const { trackPosFunnelStep } = await import("../../mongodb/pos-funnel-track.js");
  trackPosFunnelStep({
    step: parsed.data.step,
    merchantId: parsed.data.merchantId,
    storeId: parsed.data.storeId ?? null,
    correlationId: parsed.data.correlationId ?? correlationId,
  });

  return ok({ accepted: true, hintFa: TELEMETRY_UX_FA.ACCEPTED }, { status: 202 });
}
