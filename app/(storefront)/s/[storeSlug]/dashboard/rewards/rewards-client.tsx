"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  CUSTOMER_DASHBOARD_COPY_FA,
  fetchPortalRewards,
} from "@/customer-dashboard/ui";

const fa = CUSTOMER_DASHBOARD_COPY_FA;

export function PortalRewardsClient({ storeSlug }: { storeSlug: string }) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const rewardsQuery = useQuery({
    queryKey: ["customer", "rewards", storeSlug],
    queryFn: () => fetchPortalRewards(storeSlug),
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
          {fa.rewardsTitle}
        </h1>
      </header>

      {rewardsQuery.isLoading ? (
        <p className="text-[var(--color-muted)]" aria-live="polite">
          {fa.loading}
        </p>
      ) : null}

      {rewardsQuery.isError ? (
        <p className="text-[var(--color-danger,#b91c1c)]" role="alert">
          {(rewardsQuery.error as Error).message || fa.errorRetry}
        </p>
      ) : null}

      {rewardsQuery.data && rewardsQuery.data.rewards.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center text-[var(--color-muted)]"
        >
          <p>{fa.rewardsEmpty}</p>
        </section>
      ) : null}

      {rewardsQuery.data && rewardsQuery.data.rewards.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {rewardsQuery.data.rewards.map((reward) => (
            <li
              key={reward.id}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
            >
              {reward.titleFa}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
