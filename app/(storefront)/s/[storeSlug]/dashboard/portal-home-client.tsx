"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { PageHeader } from "@/components/composites/page-header";
import { StatCard } from "@/components/composites/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CUSTOMER_DASHBOARD_COPY_FA,
  fetchPortalMe,
  formatPortalJalali,
  logoutCustomer,
} from "@/customer-dashboard/ui";
import { ShoppingBag } from "lucide-react";

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
      <PageHeader
        title={fa.homeTitle}
        description={fa.homeLead}
        breadcrumbs={[
          { label: fa.navBackStorefront, href: base },
          { label: fa.homeTitle },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        {fa.moneyHint} · {fa.jalaliHint}
      </p>

      {meQuery.isLoading ? <LoadingState rows={2} label={fa.loading} /> : null}

      {meQuery.isError ? (
        <ErrorState
          description={(meQuery.error as Error).message || fa.errorRetry}
          onRetry={() => void meQuery.refetch()}
        />
      ) : null}

      {meQuery.data ? (
        <>
          <StatCard
            title={fa.profileSection}
            value={meQuery.data.storeDisplayName || storeSlug}
            description={`${fa.phoneLabel}: ${meQuery.data.phoneMasked}`}
            icon={ShoppingBag}
          />
          <Card>
            <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
              {meQuery.data.membership ? (
                <p>
                  {fa.joinedAtLabel}:{" "}
                  {formatPortalJalali(meQuery.data.membership.joinedAt)}
                </p>
              ) : (
                <p>عضویت این فروشگاه هنوز کامل نشده است.</p>
              )}
              {meQuery.data.engagement ? (
                <p>
                  خریدها: {meQuery.data.engagement.purchaseCount} · جمع:{" "}
                  {meQuery.data.engagement.totalSpendDisplayToman} {fa.priceUnit}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={onLogout}
        disabled={loggingOut}
        className="min-h-11 self-start"
      >
        {loggingOut ? fa.loading : fa.logout}
      </Button>

      {logoutError ? (
        <ErrorState description={logoutError} />
      ) : null}

      <p className="text-sm text-muted-foreground">{fa.membershipScopedHint}</p>
    </div>
  );
}
