"use client";

import { useCallback, useEffect, useState } from "react";
import { POS_OFFLINE_COPY_FA } from "@/pos-offline";
import { STAFF_PWA_COPY_FA } from "@/staff-pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mos:staff-pwa-dismiss";

/**
 * Persian RTL install banner for merchant staff POS PWA (ADR-022).
 * Distinct from store customer PWA — MerchantOS branding only.
 */
export function StaffInstallPrompt() {
  const [ready, setReady] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [hint, setHint] = useState(false);
  const [offline, setOffline] = useState(false);
  const [status, setStatus] = useState<"idle" | "installing" | "installed">(
    "idle",
  );

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      /* private mode */
    }
    setReady(true);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStatus("installed");
      setDeferred(null);
    };
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) {
      setHint(true);
      return;
    }
    setStatus("installing");
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setStatus("installed");
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    } finally {
      setDeferred(null);
    }
  }, [deferred]);

  if (!ready) {
    return null;
  }

  if (status === "installed") {
    return (
      <aside
        role="status"
        aria-label="وضعیت نصب اپلیکیشن صندوق"
        className="sticky bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
      >
        <p className="text-sm text-[var(--color-fg)]">
          {STAFF_PWA_COPY_FA.installed}
        </p>
      </aside>
    );
  }

  if (dismissed) {
    if (!offline) return null;
    return (
      <aside
        role="status"
        aria-label="وضعیت اتصال صندوق"
        className="sticky bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
      >
        <p className="text-sm text-[var(--color-fg)]">
          {POS_OFFLINE_COPY_FA.offlineQueued}
        </p>
      </aside>
    );
  }

  return (
    <aside
      role="region"
      aria-label={STAFF_PWA_COPY_FA.regionLabel}
      className="sticky bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--color-fg)]">
            {STAFF_PWA_COPY_FA.bannerTitle}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            {STAFF_PWA_COPY_FA.bannerBody}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {STAFF_PWA_COPY_FA.cashierHint}
          </p>
          {offline ? (
            <p className="text-xs text-[var(--color-fg)]" role="status">
              {POS_OFFLINE_COPY_FA.offlineQueued}
            </p>
          ) : null}
          {hint ? (
            <p className="text-xs text-[var(--color-fg)]" role="status">
              {STAFF_PWA_COPY_FA.browserHint}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={status === "installing"}
            onClick={() => void install()}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-fg)] disabled:opacity-60"
          >
            {status === "installing"
              ? STAFF_PWA_COPY_FA.installing
              : STAFF_PWA_COPY_FA.installCta}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-fg)]"
          >
            {STAFF_PWA_COPY_FA.dismissCta}
          </button>
        </div>
      </div>
    </aside>
  );
}
