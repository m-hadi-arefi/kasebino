"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { FormSection } from "@/components/composites/form-section";
import { LoadingState } from "@/components/composites/loading-state";
import { SectionHeader } from "@/components/composites/section-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    return <LoadingState rows={2} label={fa.loadingProfile} />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ErrorState
        title={(profileQuery.error as Error | null)?.message || fa.networkError}
      />
    );
  }

  const { membership, engagement } = profileQuery.data;

  return (
    <div className="flex flex-col gap-5">
      {statusMessage ? (
        <Alert>
          <AlertDescription aria-live="polite">{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      {deleteMutation.isError ? (
        <ErrorState
          title={(deleteMutation.error as Error).message || fa.networkError}
        />
      ) : null}

      <FormSection title={fa.walletTitle}>
        {walletQuery.isLoading ? (
          <LoadingState rows={1} label={fa.walletLoading} />
        ) : walletQuery.data ? (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">{fa.walletBalance}</dt>
              <dd className="font-medium text-foreground">
                {walletQuery.data.balance} {fa.walletPointsUnit}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{fa.walletLastEarn}</dt>
              <dd className="font-medium text-foreground">
                {formatLoyaltyJalali(walletQuery.data.lastEarnAt)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{fa.walletEmpty}</p>
        )}
      </FormSection>

      <FormSection title={fa.profileTitle}>
        <p className="text-2xl font-semibold text-foreground" dir="ltr">
          {membership.phoneNational}
        </p>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{fa.segmentLabel}</dt>
            <dd className="font-medium text-foreground">
              {segmentLabelFa(engagement.segment)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{fa.sourceLabel}</dt>
            <dd className="font-medium text-foreground">
              {sourceLabelFa(membership.source)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{fa.statusLabel}</dt>
            <dd className="font-medium text-foreground">
              {statusLabelFa(membership.status)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{fa.joinedLabel}</dt>
            <dd className="font-medium text-foreground">
              {formatCrmJalali(membership.joinedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{fa.purchaseCountLabel}</dt>
            <dd className="font-medium text-foreground">
              {engagement.purchaseCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{fa.totalSpendLabel}</dt>
            <dd className="font-medium text-foreground">
              {formatCrmToman(engagement.totalSpendMinor)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{fa.firstPurchaseLabel}</dt>
            <dd className="font-medium text-foreground">
              {formatCrmJalali(engagement.firstPurchaseAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{fa.lastPurchaseLabel}</dt>
            <dd className="font-medium text-foreground">
              {formatCrmJalali(engagement.lastPurchaseAt)}
            </dd>
          </div>
        </dl>

        <Button
          type="button"
          variant="outline"
          className="mt-5 w-full"
          disabled={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate()}
        >
          {deleteMutation.isPending ? fa.deleting : fa.softDelete}
        </Button>
      </FormSection>

      <section aria-label={fa.historyTitle} className="flex flex-col gap-3">
        <SectionHeader title={fa.historyTitle} />

        {historyQuery.isLoading ? (
          <LoadingState rows={2} label={fa.loadingHistory} />
        ) : null}

        {historyQuery.isError ? (
          <ErrorState
            title={(historyQuery.error as Error).message || fa.networkError}
          />
        ) : null}

        {!historyQuery.isLoading &&
        (historyQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title={fa.emptyHistory} />
        ) : null}

        <ul className="flex flex-col gap-3">
          {(historyQuery.data ?? []).map((sale) => (
            <li key={sale.id}>
              <Card>
                <CardContent className="py-4">
              <p className="font-medium text-foreground">
                {formatCrmToman(sale.totalAmountMinor)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatCrmJalali(sale.completedAt)}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                {sale.lines.map((line) => (
                  <li key={line.id}>
                    {line.productName} × {line.quantity} ·{" "}
                    {line.lineDisplayToman}
                  </li>
                ))}
              </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
