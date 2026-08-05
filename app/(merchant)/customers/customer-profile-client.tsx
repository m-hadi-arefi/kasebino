"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CRM_UI_COPY_FA,
  fetchMembershipHistory,
  fetchMembershipProfile,
  formatCrmJalali,
  formatCrmToman,
  segmentLabelFa,
  softDeleteMembership,
  sourceLabelFa,
  statusLabelFa,
} from "@/modules/crm/ui";
import {
  fetchWalletByMembership,
  formatLoyaltyJalali,
} from "@/modules/loyalty/ui";

const fa = CRM_UI_COPY_FA;

export function CustomerProfileClient({
  membershipId,
}: {
  membershipId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["crm", "profile", membershipId],
    queryFn: () => fetchMembershipProfile(membershipId),
  });

  const historyQuery = useQuery({
    queryKey: ["crm", "history", membershipId],
    queryFn: () => fetchMembershipHistory(membershipId),
  });

  const walletQuery = useQuery({
    queryKey: ["loyalty", "wallet", membershipId],
    queryFn: () => fetchWalletByMembership(membershipId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteMembership(membershipId),
    onSuccess: async () => {
      setStatusMessage(fa.deleteSuccess);
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      router.push("/customers");
    },
  });

  if (profileQuery.isLoading) {
    return (
      <p className="text-[var(--color-muted)]" aria-live="polite">
        {fa.loadingProfile}
      </p>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <p className="text-[var(--color-danger)]" role="alert">
        {(profileQuery.error as Error | null)?.message || fa.networkError}
      </p>
    );
  }

  const { membership, engagement } = profileQuery.data;

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/customers"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.backToCustomers}
        </Link>
        <Link
          href="/dashboard"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.backToDashboard}
        </Link>
      </nav>

      {statusMessage ? (
        <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}

      {deleteMutation.isError ? (
        <p className="text-[var(--color-danger)]" role="alert">
          {(deleteMutation.error as Error).message || fa.networkError}
        </p>
      ) : null}

      <section
        aria-label={fa.walletTitle}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
      >
        <h2 className="text-lg font-semibold text-[var(--color-fg)]">
          {fa.walletTitle}
        </h2>
        {walletQuery.isLoading ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]" aria-live="polite">
            {fa.walletLoading}
          </p>
        ) : walletQuery.data ? (
          <dl className="mt-3 grid gap-2 text-sm">
            <div>
              <dt className="text-[var(--color-muted)]">{fa.walletBalance}</dt>
              <dd className="font-medium text-[var(--color-fg)]">
                {walletQuery.data.balance} {fa.walletPointsUnit}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">{fa.walletLastEarn}</dt>
              <dd className="font-medium text-[var(--color-fg)]">
                {formatLoyaltyJalali(walletQuery.data.lastEarnAt)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-muted)]">{fa.walletEmpty}</p>
        )}
      </section>

      <section
        aria-label={fa.profileTitle}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
      >
        <p className="text-2xl font-semibold text-[var(--color-fg)]" dir="ltr">
          {membership.phoneNational}
        </p>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-[var(--color-muted)]">{fa.segmentLabel}</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {segmentLabelFa(engagement.segment)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">{fa.sourceLabel}</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {sourceLabelFa(membership.source)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">{fa.statusLabel}</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {statusLabelFa(membership.status)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">{fa.joinedLabel}</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {formatCrmJalali(membership.joinedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">{fa.purchaseCountLabel}</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {engagement.purchaseCount}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">{fa.totalSpendLabel}</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {formatCrmToman(engagement.totalSpendMinor)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">{fa.firstPurchaseLabel}</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {formatCrmJalali(engagement.firstPurchaseAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">{fa.lastPurchaseLabel}</dt>
            <dd className="font-medium text-[var(--color-fg)]">
              {formatCrmJalali(engagement.lastPurchaseAt)}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          className="mt-5 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5 text-[var(--color-fg)]"
          disabled={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate()}
        >
          {deleteMutation.isPending ? fa.deleting : fa.softDelete}
        </button>
      </section>

      <section aria-label={fa.historyTitle} className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-[var(--color-fg)]">
          {fa.historyTitle}
        </h2>

        {historyQuery.isLoading ? (
          <p className="text-[var(--color-muted)]" aria-live="polite">
            {fa.loadingHistory}
          </p>
        ) : null}

        {historyQuery.isError ? (
          <p className="text-[var(--color-danger)]" role="alert">
            {(historyQuery.error as Error).message || fa.networkError}
          </p>
        ) : null}

        {!historyQuery.isLoading &&
        (historyQuery.data?.length ?? 0) === 0 ? (
          <p className="text-[var(--color-muted)]">{fa.emptyHistory}</p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {(historyQuery.data ?? []).map((sale) => (
            <li
              key={sale.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <p className="font-medium text-[var(--color-fg)]">
                {formatCrmToman(sale.totalAmountMinor)}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {formatCrmJalali(sale.completedAt)}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-[var(--color-muted)]">
                {sale.lines.map((line) => (
                  <li key={line.id}>
                    {line.productName} × {line.quantity} ·{" "}
                    {line.lineDisplayToman}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
