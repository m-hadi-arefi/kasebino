"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  CUSTOMER_DASHBOARD_COPY_FA,
  fetchPortalOrders,
  formatPortalJalali,
  orderStatusLabelFa,
} from "@/customer-dashboard/ui";

const fa = CUSTOMER_DASHBOARD_COPY_FA;

export function PortalOrdersClient({ storeSlug }: { storeSlug: string }) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const ordersQuery = useQuery({
    queryKey: ["customer", "orders", storeSlug],
    queryFn: () => fetchPortalOrders(storeSlug),
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
          {fa.ordersTitle}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {fa.moneyHint} · {fa.jalaliHint}
        </p>
        <p className="text-sm text-[var(--color-muted)]">{fa.pickupOnlyHint}</p>
      </header>

      {ordersQuery.isLoading ? (
        <p className="text-[var(--color-muted)]" aria-live="polite">
          {fa.loading}
        </p>
      ) : null}

      {ordersQuery.isError ? (
        <p className="text-[var(--color-danger,#b91c1c)]" role="alert">
          {(ordersQuery.error as Error).message || fa.errorRetry}
        </p>
      ) : null}

      {ordersQuery.data && ordersQuery.data.orders.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-[var(--color-muted)]"
        >
          <p>{fa.ordersEmpty}</p>
        </section>
      ) : null}

      {ordersQuery.data && ordersQuery.data.orders.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {ordersQuery.data.orders.map((order) => (
            <li
              key={order.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div className="flex min-h-11 items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--color-fg)]">
                    {orderStatusLabelFa(order.status)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {formatPortalJalali(order.pendingPaymentAt)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {order.lines
                      .map((l) => `${l.productName} × ${l.quantity}`)
                      .join(" · ")}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium">
                  {order.totalDisplayToman} {fa.priceUnit}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-sm text-[var(--color-muted)]">
        {fa.membershipScopedHint}
      </p>
    </div>
  );
}
