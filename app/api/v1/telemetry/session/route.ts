import { NextResponse } from "next/server";

import { getMongoRuntime } from "@/infrastructure/mongodb";
import { handleTelemetrySession } from "@/infrastructure/http";

export async function POST(request: Request) {
  const result = await handleTelemetrySession(request, getMongoRuntime());
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
