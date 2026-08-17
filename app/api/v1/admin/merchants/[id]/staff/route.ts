import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { requireAdminPermission } from "@/infrastructure/http/require-auth";
import { z, ZodError } from "zod";

const AdminInviteStaffInputSchema = z.object({
  phone: z.string(),
  role: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  storeIds: z.array(z.string()).default([]),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: merchantId } = await context.params;
  const session = (await auth()) as AuthSessionSnapshot;

  const authz = requireAdminPermission(session, "admin.platform");
  if (!authz.ok) {
    return NextResponse.json(authz.result.body, { status: authz.result.status });
  }

  const api = getApiContext();
  const staff = await api.staff.listStaff(merchantId);

  return NextResponse.json({
    data: staff.map((s) => ({
      id: s.membership.id,
      merchantId: s.membership.merchantId,
      authUserId: s.membership.authUserId,
      role: s.membership.role,
      roleIds: s.roleIds ?? (s.membership.role ? [s.membership.role] : []),
      status: s.membership.status,
      createdAt: s.membership.createdAt.toISOString(),
      updatedAt: s.membership.updatedAt.toISOString(),
      storeScopes: s.storeScopes.map((scope) => scope.storeId),
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: merchantId } = await context.params;
  const session = (await auth()) as AuthSessionSnapshot;

  const authz = requireAdminPermission(session, "admin.platform");
  if (!authz.ok) {
    return NextResponse.json(authz.result.body, { status: authz.result.status });
  }

  try {
    const json = await request.json();
    const input = AdminInviteStaffInputSchema.parse(json);

    const api = getApiContext();
    const result = await api.staff.inviteStaff({
      ...input,
      merchantId,
    });

    return NextResponse.json(
      {
        data: {
          membershipId: result.id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      if (
        error.message.includes("already a staff member") ||
        error.message === "STAFF_ALREADY_EXISTS"
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
