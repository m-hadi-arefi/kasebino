import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { requirePermissionFromJwtClaims } from "@/modules/identity/application/authorization";
import { z, ZodError } from "zod";

const UpdateStaffInputSchema = z.object({
  role: z.enum(["store_manager", "store_employee", "merchant_owner", "customer", "platform_admin"]),
  storeIds: z.array(z.string()),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const json = await request.json();
    const input = UpdateStaffInputSchema.parse(json);

    const api = getApiContext();
    await api.staff.updateStaff({
      ...input,
      staffMembershipId: params.id,
      merchantId: session.user.merchantId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message === "STAFF_NOT_FOUND") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
