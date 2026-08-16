import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { requirePermissionFromJwtClaims } from "@/modules/identity/application/authorization";
import { z, ZodError } from "zod";

const InviteStaffInputSchema = z.object({
  phone: z.string(),
  role: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  storeIds: z.array(z.string()),
});

export async function POST(request: Request) {
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
    const input = InviteStaffInputSchema.parse(json);

    const api = getApiContext();
    const result = await api.staff.inviteStaff({
      ...input,
      merchantId: session.user.merchantId,
    });

    return NextResponse.json({
      data: {
        membershipId: result.id,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes("already a staff member") || error.message === "STAFF_ALREADY_EXISTS") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
