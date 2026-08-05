import { NextResponse } from "next/server";

import { getOtpRuntime } from "@/infrastructure/auth/otp-runtime";
import { getApiContext } from "@/infrastructure/composition";
import { handleMerchantOtpRequestHttp } from "@/infrastructure/http";

export async function POST(request: Request) {
  const result = await handleMerchantOtpRequestHttp(
    request,
    getApiContext(),
    getOtpRuntime(),
  );
  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
}
