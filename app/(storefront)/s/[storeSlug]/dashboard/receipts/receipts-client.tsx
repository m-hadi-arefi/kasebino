"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { PageHeader } from "@/components/composites/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CUSTOMER_DASHBOARD_COPY_FA,
  fetchPortalReceipts,
  formatPortalJalali,
} from "@/customer-dashboard/ui";

const fa = CUSTOMER_DASHBOARD_COPY_FA;

export function PortalReceiptsClient({ storeSlug }: { storeSlug: string }) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const receiptsQuery = useQuery({
    queryKey: ["customer", "receipts", storeSlug],
    queryFn: () => fetchPortalReceipts(storeSlug),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fa.receiptsTitle}
        description={`${fa.moneyHint} · ${fa.jalaliHint}`}
        breadcrumbs={[
          { label: fa.homeTitle, href: `${base}/dashboard` },
          { label: fa.receiptsTitle },
        ]}
      />

      {receiptsQuery.isLoading ? (
        <LoadingState rows={3} label={fa.loading} />
      ) : null}

      {receiptsQuery.isError ? (
        <ErrorState
          description={(receiptsQuery.error as Error).message || fa.errorRetry}
          onRetry={() => void receiptsQuery.refetch()}
        />
      ) : null}

      {receiptsQuery.data && receiptsQuery.data.receipts.length === 0 ? (
        <EmptyState title={fa.receiptsEmpty} />
      ) : null}

      {receiptsQuery.data && receiptsQuery.data.receipts.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {receiptsQuery.data.receipts.map((receipt) => (
            <li key={receipt.id}>
              <Card>
                <CardContent className="flex min-h-11 items-center justify-between gap-3 pt-4">
                  <div>
                    <p className="font-medium" dir="ltr">
                      {receipt.receiptRef.slice(0, 8)}…
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPortalJalali(receipt.completedAt)}
                    </p>
                    {!receipt.downloadUrl ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {fa.receiptsDownloadLater}
                      </p>
                    ) : (
                      <Button asChild variant="link" className="mt-1 h-auto p-0">
                        <a href={receipt.downloadUrl}>دانلود</a>
                      </Button>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-medium">
                    {receipt.totalDisplayToman} {fa.priceUnit}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
