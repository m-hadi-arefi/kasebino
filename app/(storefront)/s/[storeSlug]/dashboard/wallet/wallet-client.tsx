"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  LOYALTY_UI_COPY_FA,
  fetchCustomerStorefrontWallet,
  formatLoyaltyJalali,
  ledgerEntryLabelFa,
} from "@/modules/loyalty/ui";

const fa = LOYALTY_UI_COPY_FA;

export function CustomerWalletClient({ storeSlug }: { storeSlug: string }) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const walletQuery = useQuery({
    queryKey: ["customer", "wallet", storeSlug],
    queryFn: () => fetchCustomerStorefrontWallet(storeSlug),
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={`${base}/dashboard`}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          پنل من
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.customerWalletTitle}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {fa.customerWalletSubtitle} · مبالغ به تومان · تاریخ‌ها شمسی (تهران)
        </p>
      </header>

      {walletQuery.isLoading ? (
        <p className="text-[var(--color-muted)]" aria-live="polite">
          {fa.customerLoading}
        </p>
      ) : null}

      {walletQuery.isError ? (
        <p className="text-[var(--color-danger)]" role="alert">
          {(walletQuery.error as Error).message || fa.networkError}
        </p>
      ) : null}

      {walletQuery.data ? (
        <section
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center"
        >
          {walletQuery.data.wallet ? (
            <>
              <p className="text-sm text-[var(--color-muted)]">{fa.walletBalance}</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-fg)]">
                {walletQuery.data.wallet.balance}{" "}
                <span className="text-base font-medium">{fa.pointsUnit}</span>
              </p>
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                {fa.lastEarnLabel}:{" "}
                {formatLoyaltyJalali(walletQuery.data.wallet.lastEarnAt)}
              </p>
            </>
          ) : (
            <p className="text-[var(--color-muted)]">{fa.customerEmpty}</p>
          )}
        </section>
      ) : null}

      {walletQuery.data?.ledger?.length ? (
        <section aria-label={fa.customerLedgerTitle} className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{fa.customerLedgerTitle}</h2>
          <ul className="flex flex-col gap-2">
            {walletQuery.data.ledger.map((entry) => (
              <li
                key={entry.id}
                className="flex min-h-11 items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <span>
                  {ledgerEntryLabelFa(entry.entryType)} · {entry.points}{" "}
                  {fa.pointsUnit}
                </span>
                <span className="text-[var(--color-muted)]">
                  {formatLoyaltyJalali(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-sm text-[var(--color-muted)]">
        فقط اطلاعات عضویت همین مغازه نمایش داده می‌شود.
      </p>
    </div>
  );
}
