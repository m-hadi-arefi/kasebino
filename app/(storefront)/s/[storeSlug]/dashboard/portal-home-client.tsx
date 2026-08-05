"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CUSTOMER_DASHBOARD_COPY_FA,
  fetchPortalMe,
  formatPortalJalali,
  logoutCustomer,
} from "@/customer-dashboard/ui";

const fa = CUSTOMER_DASHBOARD_COPY_FA;

export function PortalHomeClient({ storeSlug }: { storeSlug: string }) {
  const router = useRouter();
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const meQuery = useQuery({
    queryKey: ["customer", "me", storeSlug],
    queryFn: () => fetchPortalMe(storeSlug),
  });

  async function onLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logoutCustomer();
      router.replace(`${base}/login`);
      router.refresh();
    } catch (err) {
      setLogoutError(
        err instanceof Error ? err.message : fa.errorRetry,
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href={base}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {fa.navBackStorefront}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.homeTitle}
        </h1>
        <p className="text-[var(--color-muted)]">{fa.homeLead}</p>
        <p className="text-sm text-[var(--color-muted)]">
          {fa.moneyHint} · {fa.jalaliHint}
        </p>
      </header>

      {meQuery.isLoading ? (
        <p className="text-[var(--color-muted)]" aria-live="polite">
          {fa.loading}
        </p>
      ) : null}

      {meQuery.isError ? (
        <p className="text-[var(--color-danger,#b91c1c)]" role="alert">
          {(meQuery.error as Error).message || fa.errorRetry}
        </p>
      ) : null}

      {meQuery.data ? (
        <section
          aria-label={fa.profileSection}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5"
        >
          <p className="font-medium text-[var(--color-fg)]">
            {meQuery.data.storeDisplayName || storeSlug}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]" dir="ltr">
            {fa.phoneLabel}: {meQuery.data.phoneMasked}
          </p>
          {meQuery.data.membership ? (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {fa.joinedAtLabel}:{" "}
              {formatPortalJalali(meQuery.data.membership.joinedAt)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              عضویت این فروشگاه هنوز کامل نشده است.
            </p>
          )}
          {meQuery.data.engagement ? (
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              خریدها: {meQuery.data.engagement.purchaseCount} · جمع:{" "}
              {meQuery.data.engagement.totalSpendDisplayToman} {fa.priceUnit}
            </p>
          ) : null}
        </section>
      ) : null}

      <nav
        aria-label="ناوبری پنل مشتری"
        className="flex flex-wrap gap-3 text-base"
      >
        <Link
          href={`${base}/dashboard/orders`}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          {fa.navOrders}
        </Link>
        <Link
          href={`${base}/dashboard/wallet`}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          {fa.navWallet}
        </Link>
        <Link
          href={`${base}/dashboard/rewards`}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          {fa.navRewards}
        </Link>
        <Link
          href={`${base}/dashboard/receipts`}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          {fa.navReceipts}
        </Link>
        <Link
          href={`${base}/dashboard/notifications`}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
        >
          {fa.navNotifications}
        </Link>
      </nav>

      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className="min-h-11 self-start rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 text-[var(--color-fg)] disabled:opacity-60"
      >
        {loggingOut ? fa.loading : fa.logout}
      </button>

      {logoutError ? (
        <p className="text-sm text-[var(--color-danger,#b91c1c)]" role="alert">
          {logoutError}
        </p>
      ) : null}

      <p className="text-sm text-[var(--color-muted)]">
        {fa.membershipScopedHint}
      </p>
    </div>
  );
}
