import { NextResponse } from "next/server";

import {
  assertNoSecretsInReadinessBody,
  readinessHttpStatus,
  runReadinessChecks,
} from "@/infrastructure/readiness";

/**
 * ADR-112 — readiness probe (LB / deploy).
 * Unauthenticated. Fail-closed when critical deps (Postgres, Redis) are down.
 * Never throws — always returns JSON without secrets.
 */
export async function GET() {
  try {
    const report = await runReadinessChecks();
    const body = {
      status: report.status,
      checks: report.checks,
    };
    const serialized = JSON.stringify(body);
    assertNoSecretsInReadinessBody(serialized);
    return NextResponse.json(body, {
      status: readinessHttpStatus(report),
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    const fallback = {
      status: "not_ready" as const,
      checks: {
        postgres: {
          ok: false,
          required: true,
          detail: "unreachable" as const,
        },
        redis: {
          ok: false,
          required: true,
          detail: "unreachable" as const,
        },
        mongodb: { ok: false, required: false, detail: "unreachable" as const },
        emqx: { ok: false, required: false, detail: "unreachable" as const },
        minio: { ok: false, required: false, detail: "unreachable" as const },
      },
    };
    return NextResponse.json(fallback, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
