"use client";

import { PermissionsProvider } from "@/components/auth/permissions-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ROLE_PERMISSION_MATRIX } from "@/infrastructure/security/rbac";

/**
 * Public shell smoke surface (ADR-125) — verifies sidebar/topbar do not
 * overlap main content across viewports without merchant auth.
 */
export default function UiKitShellPage() {
  return (
    <PermissionsProvider
      initialRoles={["merchant_owner"]}
      initialPermissions={[...ROLE_PERMISSION_MATRIX.merchant_owner]}
      merchantId="preview-merchant"
    >
      <AppShell variant="merchant">
        <div data-testid="shell-main-content" className="space-y-4">
          <h2 className="text-lg font-semibold">پیش‌نمایش شل فروشنده</h2>
          <p className="text-sm text-muted-foreground">
            اگر سایدبار یا هدر روی این متن بیفتد، باگ لایهٔ چیدمان هنوز باز است.
          </p>
          <div className="overflow-hidden rounded-xl border border-border">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={
                  i % 2 === 0
                    ? "bg-muted/40 px-4 py-3 text-sm"
                    : "bg-background px-4 py-3 text-sm"
                }
              >
                ردیف نمونه {i + 1} — مبلغ به تومان
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    </PermissionsProvider>
  );
}
