import { NextResponse } from "next/server";

/**
 * ADR-067 / ARD-001 — container liveness probe.
 * Orchestrators and Dockerfile HEALTHCHECK hit this path.
 * Dependency readiness is separate: `GET /api/ready` (ADR-112).
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
