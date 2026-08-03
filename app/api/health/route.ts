import { NextResponse } from "next/server";

/**
 * ADR-067 / ARD-001 — container liveness probe.
 * Orchestrators and Dockerfile HEALTHCHECK hit this path.
 * Readiness (`/api/ready`) remains deferred (DB+Redis checks).
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
