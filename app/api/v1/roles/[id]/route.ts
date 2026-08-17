import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { requirePermissionFromJwtClaims } from "@/modules/identity/application/authorization";
import { z, ZodError } from "zod";
import type { Permission } from "@/infrastructure/security/rbac";

const UpdateRoleInputSchema = z.object({
  name: z.string().min(1, "نام نقش الزامی است"),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).min(1, "حداقل یک دسترسی باید انتخاب شود"),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
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
      roles: session.user.roles ?? [],
    },
    "merchant.staff_manage",
    { resourceMerchantId: session.user.merchantId ?? "" },
  );

  const api = getApiContext();
  try {
    const roleWithPerms = await api.roles.getRole(session.user.merchantId, id);
    return NextResponse.json({
      data: {
        id: roleWithPerms.role.id,
        merchantId: roleWithPerms.role.merchantId,
        name: roleWithPerms.role.name,
        code: roleWithPerms.role.code,
        description: roleWithPerms.role.description,
        isSystem: roleWithPerms.role.isSystem,
        permissions: roleWithPerms.permissions,
        createdAt: roleWithPerms.role.createdAt.toISOString(),
        updatedAt: roleWithPerms.role.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "ROLE_NOT_FOUND" }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
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
      roles: session.user.roles ?? [],
    },
    "merchant.staff_manage",
    { resourceMerchantId: session.user.merchantId ?? "" },
  );

  try {
    const json = await request.json();
    const input = UpdateRoleInputSchema.parse(json);

    const api = getApiContext();
    const result = await api.roles.updateCustomRole({
      merchantId: session.user.merchantId,
      roleId: id,
      name: input.name,
      description: input.description,
      permissions: input.permissions as Permission[],
      actorRoles: session.user.roles ?? [],
    });

    return NextResponse.json({
      data: {
        id: result.role.id,
        name: result.role.name,
        description: result.role.description,
        isSystem: result.role.isSystem,
        permissions: result.permissions,
        createdAt: result.role.createdAt.toISOString(),
        updatedAt: result.role.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      if (error.message === "ROLE_NOT_FOUND") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
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
      roles: session.user.roles ?? [],
    },
    "merchant.staff_manage",
    { resourceMerchantId: session.user.merchantId ?? "" },
  );

  try {
    const api = getApiContext();
    await api.roles.deleteCustomRole({
      merchantId: session.user.merchantId,
      roleId: id,
      actorRoles: session.user.roles ?? [],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ROLE_NOT_FOUND") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
