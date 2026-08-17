import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import { getApiContext } from "@/infrastructure/composition";
import { requireAdminPermission } from "@/infrastructure/http/require-auth";
import { z, ZodError } from "zod";
import type { Permission } from "@/infrastructure/security/rbac";

const CreateRoleInputSchema = z.object({
  name: z.string().min(1, "نام نقش الزامی است"),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()).min(1, "حداقل یک دسترسی باید انتخاب شود"),
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
  const rolesWithPerms = await api.roles.listRoles(merchantId);

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
    const input = CreateRoleInputSchema.parse(json);

    const api = getApiContext();
    const result = await api.roles.createCustomRole({
      merchantId,
      name: input.name,
      description: input.description,
      permissions: input.permissions as Permission[],
      actorRoles: ["platform_admin"],
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
