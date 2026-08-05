import { NextResponse } from "next/server";

import { getOtpRuntime } from "@/infrastructure/auth/otp-runtime";
import { getApiContext } from "@/infrastructure/composition";
import { handleCustomerOtpRequestHttp } from "@/infrastructure/http";

export async function POST(request: Request) {
  const result = await handleCustomerOtpRequestHttp(
    request,
    getApiContext(),
    getOtpRuntime(),
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
