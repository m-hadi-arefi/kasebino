"use client";

import { useEffect, useState } from "react";
import {
  POS_OFFLINE_COPY_FA,
  POS_OFFLINE_INSTALL_UX,
  POS_OFFLINE_SERVICE_WORKER,
  bannerForConnectivity,
} from "@/pos-offline";

/**
 * Persian RTL offline / queue status for merchant staff POS (ADR-024).
 * Never used on store customer PWA (ADR-023).
 */
export function StaffOfflineStatus({
  queuedCount = 0,
}: {
  queuedCount?: number;
}) {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setReady(true);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register(POS_OFFLINE_SERVICE_WORKER.scriptUrl, {
          scope: POS_OFFLINE_SERVICE_WORKER.scope,
        })
        .catch(() => {
          /* installability still works via manifest (ADR-022) */
        });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!ready) {
    return null;
  }

  const banner = bannerForConnectivity({ online, queuedCount });

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={POS_OFFLINE_COPY_FA.regionLabel}
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
    >
      <p className="text-sm text-[var(--color-fg)]">{banner}</p>
      <p className="text-xs text-[var(--color-muted)]">
        {POS_OFFLINE_COPY_FA.tomanNote}
      </p>
      {!online || queuedCount > 0 ? (
        <button
          type="button"
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-fg)]"
        >
          {POS_OFFLINE_INSTALL_UX.copyFa.reviewQueueCta}
        </button>
      ) : null}
    </section>
  );
}
