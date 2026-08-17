import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { requirePermissionFromJwtClaims } from "@/modules/identity/application/authorization";
import { z, ZodError } from "zod";
import type { Permission } from "@/infrastructure/security/rbac";

const CreateRoleInputSchema = z.object({
  name: z.string().min(1, "نام نقش الزامی است"),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).min(1, "حداقل یک دسترسی باید انتخاب شود"),
});

export async function GET() {
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
  const rolesWithPerms = await api.roles.listRoles(session.user.merchantId);

  return NextResponse.json({
    data: rolesWithPerms.map((rp) => ({
      id: rp.role.id,
      merchantId: rp.role.merchantId,
      name: rp.role.name,
      code: rp.role.code,
      description: rp.role.description,
      isSystem: rp.role.isSystem,
      permissions: rp.permissions,
      createdAt: rp.role.createdAt.toISOString(),
      updatedAt: rp.role.updatedAt.toISOString(),
    })),
  });
}

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
      roles: session.user.roles ?? [],
    },
    "merchant.staff_manage",
    { resourceMerchantId: session.user.merchantId ?? "" },
  );

  try {
    const json = await request.json();
    const input = CreateRoleInputSchema.parse(json);

    const api = getApiContext();
    const result = await api.roles.createCustomRole({
      merchantId: session.user.merchantId,
      name: input.name,
      description: input.description,
      permissions: input.permissions as Permission[],
      actorRoles: session.user.roles ?? [],
    });

    return NextResponse.json(
      {
        data: {
          id: result.role.id,
          name: result.role.name,
          description: result.role.description,
          isSystem: result.role.isSystem,
          permissions: result.permissions,
          createdAt: result.role.createdAt.toISOString(),
          updatedAt: result.role.updatedAt.toISOString(),
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
