import type { Metadata } from "next";
import { staffManifestPath } from "@/staff-pwa";
import { PosChrome } from "@/components/layout/app-shell";

import { StaffInstallPrompt } from "./install-prompt";
import { StaffOfflineStatus } from "./offline-status";
import { PosProviders } from "./pos-providers";
import { PosRegister } from "./pos-register";

export const metadata: Metadata = {
  title: "صندوق فروش | کاسبینو",
  description: "پایانه فروش پرسنل — کاسبینو",
  manifest: staffManifestPath(),
  appleWebApp: {
    capable: true,
    title: "صندوق کاسبینو",
    statusBarStyle: "default",
  },
};

/**
 * Merchant staff POS — ADR-096 CompleteSale UI + ADR-024 offline chrome.
 * Staff PWA only (ADR-022); never store customer PWA (ADR-023).
 */
export default function MerchantPosPage() {
  return (
    <>
      <PosChrome>
        <div className="flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-foreground">صندوق فروش</h1>
            <p className="text-sm text-muted-foreground">
              پایانه فروش پرسنل — بارکد، موبایل مشتری، جمع به تومان
            </p>
          </header>
          <StaffOfflineStatus />
          <p className="text-sm text-muted-foreground">
            مسیر آنلاین صندوق اولویت دارد؛ صف آفلاین در قطعی شبکه فعال است.
          </p>
          <PosProviders>
            <PosRegister />
          </PosProviders>
        </div>
      </PosChrome>
      <StaffInstallPrompt />
    </>
  );
}
