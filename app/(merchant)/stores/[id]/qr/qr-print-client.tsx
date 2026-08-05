"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  STORE_QR_PRINT_UI_COPY_FA,
  fetchStoreQrMeta,
  type StoreQrMetaDto,
} from "@/modules/store/ui";

const fa = STORE_QR_PRINT_UI_COPY_FA;

type Props = {
  storeId: string;
};

export function StoreQrPrintClient({ storeId }: Props) {
  const [meta, setMeta] = useState<StoreQrMetaDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchStoreQrMeta(storeId);
        if (!cancelled) setMeta(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : fa.loadError);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const dataUrl = meta
    ? `data:${meta.contentType};base64,${meta.pngBase64}`
    : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6 print:max-w-none print:px-8 print:py-10">
      <header className="flex flex-col gap-2 print:items-center print:text-center">
        <div className="flex flex-wrap gap-3 print:hidden">
          <Link
            href="/dashboard"
            className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            {fa.backDashboard}
          </Link>
          <Link
            href={`/stores/${encodeURIComponent(storeId)}/location`}
            className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            {fa.backLocation}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.title}
        </h1>
        <p className="text-[var(--color-muted)] print:text-base">{fa.subtitle}</p>
      </header>

      <p aria-live="polite" className="min-h-6 text-sm text-[var(--color-danger)] print:hidden">
        {error}
      </p>

      <section
        className="flex flex-col items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 print:border-0 print:bg-transparent"
        aria-label={fa.title}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="کد QR فروشگاه"
            width={280}
            height={280}
            className="h-auto w-[min(70vw,280px)] print:w-[70mm]"
          />
        ) : (
          <p className="text-sm text-[var(--color-muted)]">{fa.loading}</p>
        )}
        <p className="text-center text-lg font-medium text-[var(--color-fg)]">
          {fa.stickerCta}
        </p>
        {meta ? (
          <p className="break-all text-center text-xs text-[var(--color-muted)] print:text-sm">
            <span className="block font-medium text-[var(--color-fg)]">
              {fa.targetLabel}
            </span>
            {meta.targetUrl}
          </p>
        ) : null}
      </section>

      <ul className="flex flex-col gap-2 text-sm text-[var(--color-muted)] print:gap-3 print:text-base">
        <li>{fa.stickerWindow}</li>
        <li>{fa.stickerCounter}</li>
        <li className="print:hidden">{fa.downloadHint}</li>
      </ul>

      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 font-medium text-[var(--color-primary-fg)] print:hidden"
        onClick={() => window.print()}
        disabled={!meta}
      >
        {fa.printCta}
      </button>
    </main>
  );
}
