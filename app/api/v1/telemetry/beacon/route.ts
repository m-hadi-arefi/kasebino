import { NextResponse } from "next/server";

import { getMongoRuntime } from "@/infrastructure/mongodb";
import { handleTelemetryBeacon } from "@/infrastructure/http";

export async function POST(request: Request) {
  const result = await handleTelemetryBeacon(request, getMongoRuntime());
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
