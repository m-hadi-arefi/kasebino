"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { PageHeader } from "@/components/composites/page-header";
import { StatCard } from "@/components/composites/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LOYALTY_UI_COPY_FA,
  fetchCustomerStorefrontWallet,
  formatLoyaltyJalali,
  ledgerEntryLabelFa,
} from "@/modules/loyalty/ui";
import { Wallet } from "lucide-react";

const fa = LOYALTY_UI_COPY_FA;

export function CustomerWalletClient({ storeSlug }: { storeSlug: string }) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const walletQuery = useQuery({
    queryKey: ["customer", "wallet", storeSlug],
    queryFn: () => fetchCustomerStorefrontWallet(storeSlug),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fa.customerWalletTitle}
        description={`${fa.customerWalletSubtitle} · مبالغ به تومان · تاریخ‌ها شمسی (تهران)`}
        breadcrumbs={[
          { label: "پنل من", href: `${base}/dashboard` },
          { label: fa.customerWalletTitle },
        ]}
      />

      {walletQuery.isLoading ? (
        <LoadingState rows={2} label={fa.customerLoading} />
      ) : null}

      {walletQuery.isError ? (
        <ErrorState
          description={(walletQuery.error as Error).message || fa.networkError}
          onRetry={() => void walletQuery.refetch()}
        />
      ) : null}

      {walletQuery.data?.wallet ? (
        <StatCard
          title={fa.walletBalance}
          value={
            <>
              {walletQuery.data.wallet.balance}{" "}
              <span className="text-base font-medium">{fa.pointsUnit}</span>
            </>
          }
          description={`${fa.lastEarnLabel}: ${formatLoyaltyJalali(walletQuery.data.wallet.lastEarnAt)}`}
          icon={Wallet}
        />
      ) : null}

      {walletQuery.data && !walletQuery.data.wallet ? (
        <EmptyState title={fa.customerEmpty} />
      ) : null}

      {walletQuery.data?.ledger?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{fa.customerLedgerTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {walletQuery.data.ledger.map((entry) => (
                <li
                  key={entry.id}
                  className="flex min-h-11 items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {ledgerEntryLabelFa(entry.entryType)} · {entry.points}{" "}
                      {fa.pointsUnit}
                    </p>
                    <p className="text-muted-foreground">
                      {formatLoyaltyJalali(entry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        فقط اطلاعات عضویت همین مغازه نمایش داده می‌شود.
      </p>
    </div>
  );
}
