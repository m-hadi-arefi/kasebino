"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { PageHeader } from "@/components/composites/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fa.ordersTitle}
        description={`${fa.moneyHint} · ${fa.jalaliHint}`}
        breadcrumbs={[
          { label: fa.homeTitle, href: `${base}/dashboard` },
          { label: fa.ordersTitle },
        ]}
      />

      <p className="text-sm text-muted-foreground">{fa.pickupOnlyHint}</p>

      {ordersQuery.isLoading ? (
        <LoadingState rows={3} label={fa.loading} />
      ) : null}

      {ordersQuery.isError ? (
        <ErrorState
          description={(ordersQuery.error as Error).message || fa.errorRetry}
          onRetry={() => void ordersQuery.refetch()}
        />
      ) : null}

      {ordersQuery.data && ordersQuery.data.orders.length === 0 ? (
        <EmptyState title={fa.ordersEmpty} />
      ) : null}

      {ordersQuery.data && ordersQuery.data.orders.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {ordersQuery.data.orders.map((order) => (
            <li key={order.id}>
              <Card>
                <CardContent className="flex min-h-11 items-start justify-between gap-3 pt-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {orderStatusLabelFa(order.status)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPortalJalali(order.pendingPaymentAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.lines
                        .map((l) => `${l.productName} × ${l.quantity}`)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">
                    {order.totalDisplayToman} {fa.priceUnit}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-sm text-muted-foreground">{fa.membershipScopedHint}</p>
    </div>
  );
}
