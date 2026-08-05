"use client";

import { useCallback, useEffect, useState } from "react";
import {
  POS_OFFLINE_COPY_FA,
  POS_OFFLINE_INSTALL_UX,
  POS_OFFLINE_SERVICE_WORKER,
  bannerForConnectivity,
} from "@/pos-offline/client";
import {
  flushOfflineSalesViaPosApi,
  listRejectedOfflineSales,
  offlineQueueDepth,
  type BrowserOfflineSaleDraft,
} from "@/pos-offline/browser-queue";
import { POS_CONSENT_NOTICE_VERSION } from "@/modules/pos/ui/copy";
import { formatPosToman } from "@/modules/pos/ui/format";

/**
 * Persian RTL offline / queue status for merchant staff POS (ADR-024 / ADR-105).
 * Never used on store customer PWA (ADR-023).
 */
export function StaffOfflineStatus() {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [rejected, setRejected] = useState<readonly BrowserOfflineSaleDraft[]>(
    [],
  );
  const [syncing, setSyncing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [depth, rejectedRows] = await Promise.all([
        offlineQueueDepth(),
        listRejectedOfflineSales(),
      ]);
      setQueuedCount(depth);
      setRejected(rejectedRows);
    } catch {
      /* IDB unavailable in private mode */
    }
  }, []);

  const flush = useCallback(async () => {
    setSyncing(true);
    setFlash(null);
    try {
      const result = await flushOfflineSalesViaPosApi({
        consentNoticeVersion: POS_CONSENT_NOTICE_VERSION,
      });
      if (result.rejectedForReview > 0) {
        setFlash(POS_OFFLINE_COPY_FA.stockRejected);
        setReviewOpen(true);
      } else if (result.failed > 0) {
        setFlash(POS_OFFLINE_COPY_FA.syncFailed);
      } else if (result.synced > 0) {
        setFlash(POS_OFFLINE_COPY_FA.synced);
      }
      await refresh();
    } catch {
      setFlash(POS_OFFLINE_COPY_FA.syncFailed);
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setReady(true);
    void refresh();

    const onOnline = () => {
      setOnline(true);
      void flush();
    };
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

      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === "mos-staff-sale-queue-sync") {
          void flush();
        }
      };
      navigator.serviceWorker.addEventListener("message", onMessage);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        navigator.serviceWorker.removeEventListener("message", onMessage);
      };
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flush, refresh]);

  if (!ready) {
    return null;
  }

  const banner = bannerForConnectivity({
    online,
    queuedCount,
    syncing,
    rejectedCount: rejected.length,
  });

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={POS_OFFLINE_COPY_FA.regionLabel}
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
    >
      <p className="text-sm text-[var(--color-fg)]">{banner}</p>
      {(queuedCount > 0 || rejected.length > 0) && (
        <p className="text-xs text-[var(--color-muted)]">
          {POS_OFFLINE_COPY_FA.queuedHeading}: {queuedCount}
          {rejected.length > 0
            ? ` · ${POS_OFFLINE_COPY_FA.rejectedHeading}: ${rejected.length}`
            : ""}
        </p>
      )}
      <p className="text-xs text-[var(--color-muted)]">
        {POS_OFFLINE_COPY_FA.tomanNote}
      </p>
      {flash ? (
        <p className="text-xs text-[var(--color-fg)]" role="status">
          {flash}
        </p>
      ) : null}
      {!online || queuedCount > 0 || rejected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-fg)]"
            onClick={() => setReviewOpen((v) => !v)}
          >
            {POS_OFFLINE_INSTALL_UX.copyFa.reviewQueueCta}
          </button>
          {online && queuedCount > 0 ? (
            <button
              type="button"
              disabled={syncing}
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm text-[var(--color-primary-fg)] disabled:opacity-60"
              onClick={() => void flush()}
            >
              {syncing
                ? POS_OFFLINE_COPY_FA.syncing
                : POS_OFFLINE_COPY_FA.retrySyncCta}
            </button>
          ) : null}
        </div>
      ) : null}

      {reviewOpen ? (
        <div
          className="mt-2 flex flex-col gap-3 border-t border-[var(--color-border)] pt-3"
          role="region"
          aria-label={POS_OFFLINE_COPY_FA.rejectedHeading}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-fg)]">
              {POS_OFFLINE_COPY_FA.rejectedHeading}
            </h3>
            <button
              type="button"
              className="inline-flex min-h-11 items-center px-2 text-sm text-[var(--color-muted)]"
              onClick={() => setReviewOpen(false)}
            >
              {POS_OFFLINE_COPY_FA.closeReviewCta}
            </button>
          </div>
          {rejected.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              {POS_OFFLINE_COPY_FA.emptyRejected}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rejected.map((draft) => (
                <li
                  key={draft.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  <p className="text-[var(--color-fg)]">
                    {POS_OFFLINE_COPY_FA.stockRejected}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {draft.lines.map((l) => l.productName).join("، ")} —{" "}
                    {formatPosToman(draft.totalAmountMinor)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
