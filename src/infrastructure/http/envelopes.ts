/**
 * ADR-094 / ADR-030 — response helpers: correlationId, Zod parse, envelopes.
 */

import type { ZodType } from "zod";

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  ensureCorrelationId,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
} from "../../api-standards/index.js";
import type { HttpHandlerResult, HttpRequestLike } from "./types.js";

export function correlationIdFrom(
  request: Pick<HttpRequestLike, "headers">,
): string {
  return ensureCorrelationId(
    request.headers.get("x-correlation-id") ??
      request.headers.get("X-Correlation-Id"),
  );
}

export function ok<T>(
  data: T,
  init?: { status?: number; meta?: Record<string, unknown>; headers?: Record<string, string> },
): HttpHandlerResult {
  const body: ApiSuccessEnvelope<T> = createSuccessEnvelope(
    data,
    init?.meta,
  );
  return {
    status: init?.status ?? 200,
    body,
    ...(init?.headers !== undefined ? { headers: init.headers } : {}),
  };
}

export function fail(input: {
  code: string;
  correlationId: string;
  status: number;
  messageFa?: string;
  details?: Record<string, unknown>;
  headers?: Record<string, string>;
}): HttpHandlerResult {
  const body: ApiErrorEnvelope = createErrorEnvelope({
    code: input.code,
    correlationId: input.correlationId,
    ...(input.messageFa !== undefined ? { messageFa: input.messageFa } : {}),
    ...(input.details !== undefined ? { details: input.details } : {}),
  });
  return {
    status: input.status,
    body,
    ...(input.headers !== undefined ? { headers: input.headers } : {}),
  };
}

export type ParseBodySuccess<T> = { ok: true; data: T };
export type ParseBodyFailure = {
  ok: false;
  result: HttpHandlerResult;
};

/**
 * Zod-validate JSON body. Failures → VALIDATION_ERROR + Persian message + correlationId.
 */
export async function parseBody<T>(
  request: HttpRequestLike,
  schema: ZodType<T>,
  correlationId: string,
): Promise<ParseBodySuccess<T> | ParseBodyFailure> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      result: fail({
        code: "VALIDATION_ERROR",
        correlationId,
        status: 400,
        messageFa: "بدن درخواست باید JSON معتبر باشد.",
      }),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return {
      ok: false,
      result: fail({
        code: "VALIDATION_ERROR",
        correlationId,
        status: 400,
        details: { issues },
      }),
    };
  }

  return { ok: true, data: parsed.data };
}

export function requireIdempotencyHeader(
  request: Pick<HttpRequestLike, "headers">,
  correlationId: string,
): { ok: true; key: string } | { ok: false; result: HttpHandlerResult } {
  const key =
    request.headers.get("idempotency-key")?.trim() ||
    request.headers.get("Idempotency-Key")?.trim() ||
    "";
  if (!key) {
    return {
      ok: false,
      result: fail({
        code: "IDEMPOTENCY_KEY_REQUIRED",
        correlationId,
        status: 400,
      }),
    };
  }
  return { ok: true, key };
}

export function methodNotAllowed(
  correlationId: string,
  allowed: string,
): HttpHandlerResult {
  return fail({
    code: "VALIDATION_ERROR",
    correlationId,
    status: 405,
    messageFa: `فقط درخواست ${allowed} مجاز است.`,
  });
}
