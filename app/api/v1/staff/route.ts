import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { requirePermissionFromJwtClaims } from "@/modules/identity/application/authorization";

export async function GET(request: Request) {
  const session = (await auth()) as AuthSessionSnapshot;
  if (!session?.user?.merchantId) {
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

  const api = getApiContext();
  const staff = await api.staff.listStaff(session.user.merchantId);

  return NextResponse.json({
    data: staff.map((s) => ({
      id: s.membership.id,
      merchantId: s.membership.merchantId,
      authUserId: s.membership.authUserId,
      role: s.membership.role,
      status: s.membership.status,
      createdAt: s.membership.createdAt.toISOString(),
      updatedAt: s.membership.updatedAt.toISOString(),
      storeScopes: s.storeScopes.map((scope) => scope.storeId),
    })),
  });
}
