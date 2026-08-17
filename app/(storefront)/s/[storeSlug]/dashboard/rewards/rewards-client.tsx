"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { PageHeader } from "@/components/composites/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  CUSTOMER_DASHBOARD_COPY_FA,
  fetchPortalRewards,
} from "@/modules/customer-identity/ui/dashboard/ui";

const fa = CUSTOMER_DASHBOARD_COPY_FA;

export function PortalRewardsClient({ storeSlug }: { storeSlug: string }) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const rewardsQuery = useQuery({
    queryKey: ["customer", "rewards", storeSlug],
    queryFn: () => fetchPortalRewards(storeSlug),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fa.rewardsTitle}
        breadcrumbs={[
          { label: fa.homeTitle, href: `${base}/dashboard` },
          { label: fa.rewardsTitle },
        ]}
      />

      {rewardsQuery.isLoading ? (
        <LoadingState rows={2} label={fa.loading} />
      ) : null}

      {rewardsQuery.isError ? (
        <ErrorState
          description={(rewardsQuery.error as Error).message || fa.errorRetry}
          onRetry={() => void rewardsQuery.refetch()}
        />
      ) : null}

      {rewardsQuery.data && rewardsQuery.data.rewards.length === 0 ? (
        <EmptyState title={fa.rewardsEmpty} />
      ) : null}

      {rewardsQuery.data && rewardsQuery.data.rewards.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {rewardsQuery.data.rewards.map((reward) => (
            <li key={reward.id}>
              <Card>
                <CardContent className="min-h-11 py-4">{reward.titleFa}</CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
