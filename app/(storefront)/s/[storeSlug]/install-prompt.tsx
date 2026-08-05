"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STORE_CUSTOMER_PWA_COPY_FA,
  STORE_CUSTOMER_PWA_OFFLINE,
  storeCustomerScope,
} from "@/store-customer-pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type StoreInstallPromptProps = {
  storeSlug: string;
  displayName?: string;
};

const DISMISS_PREFIX = "mos:store-pwa-dismiss:";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notCriOS = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notCriOS;
}

/**
 * Persian RTL install banner for store customer PWA (ADR-023 / ADR-105).
 * Distinct from staff POS PWA — store branding only.
 */
export function StoreCustomerInstallPrompt({
  storeSlug,
  displayName,
}: StoreInstallPromptProps) {
  const label = displayName?.trim() || storeSlug;
  const fa = STORE_CUSTOMER_PWA_COPY_FA;
  const [ready, setReady] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [hint, setHint] = useState(false);
  const [ios, setIos] = useState(false);
  const [status, setStatus] = useState<"idle" | "installing" | "installed">(
    "idle",
  );

  useEffect(() => {
    try {
      if (window.localStorage.getItem(`${DISMISS_PREFIX}${storeSlug}`) === "1") {
        setDismissed(true);
      }
    } catch {
      /* private mode */
    }
    setIos(isIosSafari());
    setReady(true);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register(STORE_CUSTOMER_PWA_OFFLINE.serviceWorker, {
          scope: storeCustomerScope(storeSlug),
        })
        .catch(() => {
          /* manifest install still works without SW */
        });
    }

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStatus("installed");
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [storeSlug]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(`${DISMISS_PREFIX}${storeSlug}`, "1");
    } catch {
      /* ignore */
    }
  }, [storeSlug]);

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

  if (!ready || (dismissed && status !== "installed")) {
    return null;
  }

  if (status === "installed") {
    return (
      <aside
        role="status"
        aria-label="وضعیت نصب اپلیکیشن فروشگاه"
        className="sticky bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
      >
        <p className="text-sm text-[var(--color-fg)]">{fa.installed}</p>
      </aside>
    );
  }

  return (
    <aside
      role="region"
      aria-label={fa.regionLabel}
      className="sticky bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--color-fg)]">
            {fa.bannerTitle}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            «{label}» — {fa.bannerBody}
          </p>
          <p className="text-xs text-[var(--color-muted)]">{fa.offlineNote}</p>
          {hint || ios ? (
            <p className="text-xs text-[var(--color-fg)]" role="status">
              {ios ? fa.iosHint : fa.browserHint}
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
            {status === "installing" ? fa.installing : fa.installCta}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-fg)]"
          >
            {fa.dismissCta}
          </button>
        </div>
      </div>
    </aside>
  );
}
