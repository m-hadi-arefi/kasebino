"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  CUSTOMER_DASHBOARD_COPY_FA,
  fetchPortalReceipts,
  formatPortalJalali,
} from "@/customer-dashboard/ui";

const fa = CUSTOMER_DASHBOARD_COPY_FA;

export function PortalReceiptsClient({ storeSlug }: { storeSlug: string }) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const receiptsQuery = useQuery({
    queryKey: ["customer", "receipts", storeSlug],
    queryFn: () => fetchPortalReceipts(storeSlug),
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={`${base}/dashboard`}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {fa.homeTitle}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.receiptsTitle}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {fa.moneyHint} · {fa.jalaliHint}
        </p>
      </header>

      {receiptsQuery.isLoading ? (
        <p className="text-[var(--color-muted)]" aria-live="polite">
          {fa.loading}
        </p>
      ) : null}

      {receiptsQuery.isError ? (
        <p className="text-[var(--color-danger,#b91c1c)]" role="alert">
          {(receiptsQuery.error as Error).message || fa.errorRetry}
        </p>
      ) : null}

      {receiptsQuery.data && receiptsQuery.data.receipts.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-[var(--color-muted)]"
        >
          <p>{fa.receiptsEmpty}</p>
        </section>
      ) : null}

      {receiptsQuery.data && receiptsQuery.data.receipts.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {receiptsQuery.data.receipts.map((receipt) => (
            <li
              key={receipt.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div className="flex min-h-11 items-center justify-between gap-3">
                <div>
                  <p className="font-medium" dir="ltr">
                    {receipt.receiptRef.slice(0, 8)}…
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {formatPortalJalali(receipt.completedAt)}
                  </p>
                  {!receipt.downloadUrl ? (
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {fa.receiptsDownloadLater}
                    </p>
                  ) : (
                    <a
                      href={receipt.downloadUrl}
                      className="mt-1 inline-block text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
                    >
                      دانلود
                    </a>
                  )}
                </div>
                <p className="shrink-0 text-sm font-medium">
                  {receipt.totalDisplayToman} {fa.priceUnit}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
