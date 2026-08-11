import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { requirePermissionFromJwtClaims } from "@/modules/identity/application/authorization";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = (await auth()) as AuthSessionSnapshot;
  if (!session?.user?.merchantId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  requirePermissionFromJwtClaims(
    { 
      ...session.user, 
      sub: session.user.id ?? "", 
      tokenVersion: session.user.tokenVersion ?? 0,
      merchantId: session.user.merchantId ?? null,
      roles: session.user.roles ?? []
    }, 
    "merchant.staff_manage", 
    { resourceMerchantId: session.user.merchantId ?? "" }
  );

  try {
    const api = getApiContext();
    await api.staff.deactivateStaff({
      staffMembershipId: id,
      merchantId: session.user.merchantId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message === "STAFF_NOT_FOUND") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (error.message.includes("Cannot deactivate")) {
         return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
