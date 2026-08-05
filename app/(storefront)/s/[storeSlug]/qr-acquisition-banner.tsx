"use client";

import { useEffect } from "react";

import { STOREFRONT_UI_COPY_FA } from "@/modules/storefront/ui/copy";

const fa = STOREFRONT_UI_COPY_FA;

/**
 * ADR-104 FR-4 + ADR-110 — attribute QR land (`?src=qr`) and post telemetry beacon.
 */
export function QrAcquisitionBanner({
  merchantId,
  storeId,
}: {
  merchantId?: string;
  storeId?: string;
} = {}) {
  useEffect(() => {
    try {
      document.documentElement.dataset.mosAcquisitionSource = "qr";
      window.dispatchEvent(
        new CustomEvent("mos:storefront-visited", {
          detail: {
            eventType: "StorefrontVisited",
            source: "qr",
          },
        }),
      );

      const resolvedMerchantId =
        merchantId ??
        document.documentElement.dataset.mosMerchantId ??
        "";
      const resolvedStoreId =
        storeId ?? document.documentElement.dataset.mosStoreId ?? null;

      if (resolvedMerchantId) {
        const eventId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `qr-${Date.now()}`;
        void fetch("/api/v1/telemetry/beacon", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            events: [
              {
                eventId,
                eventType: "StorefrontVisited",
                merchantId: resolvedMerchantId,
                storeId: resolvedStoreId,
                path:
                  typeof window !== "undefined"
                    ? window.location.pathname
                    : null,
                source: "qr",
                funnelCritical: true,
                properties: { acquisitionSource: "qr" },
              },
            ],
          }),
          keepalive: true,
        }).catch(() => {
          /* best-effort */
        });
      }
    } catch {
      /* ignore */
    }
  }, [merchantId, storeId]);

  return (
    <section
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
      data-mos-acquisition-source="qr"
      aria-label={fa.qrLandingWelcome}
    >
      <p className="font-medium text-[var(--color-fg)]">{fa.qrLandingWelcome}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{fa.qrLandingHint}</p>
      <p className="sr-only">{fa.qrLandingHint}</p>
    </section>
  );
}
