import type { Metadata } from "next";
import { staffManifestPath } from "@/staff-pwa";
import { StaffInstallPrompt } from "./install-prompt";
import { StaffOfflineStatus } from "./offline-status";

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
 * Merchant staff POS shell — ADR-022 install + ADR-024 offline queue.
 * Never store customer PWA.
 */
export default function MerchantPosPage() {
  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-[var(--color-muted)]">کاسبینو</p>
          <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
            صندوق فروش
          </h1>
          <p className="text-[var(--color-muted)]">
            پایانه فروش پرسنل — بارکد، موبایل مشتری، جمع به تومان
          </p>
        </header>
        <StaffOfflineStatus />
        <section
          aria-label="وضعیت صندوق"
          className="flex flex-col gap-2 text-sm text-[var(--color-muted)]"
        >
          <p>مسیر آنلاین صندوق اولویت دارد؛ صف آفلاین در قطعی شبکه فعال است.</p>
        </section>
      </main>
      <StaffInstallPrompt />
    </>
  );
}
