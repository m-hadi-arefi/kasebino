import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AuthSessionSnapshot } from "@/infrastructure/auth";
import {
  PERMISSION_CATALOG,
  PERMISSION_DOMAINS,
  normalizeRoles,
} from "@/rbac";

export async function GET() {
  const session = (await auth()) as AuthSessionSnapshot;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPlatformAdmin = normalizeRoles(session.user.roles ?? []).includes("platform_admin");

  // Filter out internal platform/customer permissions for merchant users
  const catalogEntries = Object.values(PERMISSION_CATALOG).filter((p) => {
    if (isPlatformAdmin) return true;
    return !p.isPlatformOnly && !p.isCustomerOnly;
  });

  return NextResponse.json({
    data: {
      domains: PERMISSION_DOMAINS,
      permissions: catalogEntries,
    },
  });
}
