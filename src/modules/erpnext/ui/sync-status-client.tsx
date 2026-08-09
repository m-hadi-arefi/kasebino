"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { StatusChip } from "@/components/composites/status-chip";
import { Card, CardContent } from "@/components/ui/card";

import { fetchFinanceSyncRecords } from "./api.js";
import { ERPNEXT_FINANCE_UI_COPY_FA } from "./copy.js";
import { formatFinanceJalali, syncStatusLabelFa } from "./format.js";

const fa = ERPNEXT_FINANCE_UI_COPY_FA;

export function FinanceSyncStatusClient() {
  const query = useQuery({
    queryKey: ["erpnext", "finance", "sync"],
    queryFn: () => fetchFinanceSyncRecords(),
  });

  if (query.isLoading) {
    return <LoadingState rows={3} label={fa.loading} />;
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        title={(query.error as Error | null)?.message || fa.networkError}
      />
    );
  }

  if (query.data.records.length === 0) {
    return <EmptyState title={fa.emptyInvoices} description={fa.emptyHint} />;
  }

  return (
    <ul className="flex flex-col gap-2" aria-live="polite">
      {query.data.records.map((row) => (
        <li key={row.id}>
          <Card>
            <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">
                  {row.entityType} · {row.entityId.slice(0, 8)}…
                </div>
                <div className="text-muted-foreground">
                  {row.erpnextType ?? "—"}: {row.erpnextId ?? "—"} ·{" "}
                  {formatFinanceJalali(row.updatedAt)}
                </div>
                {row.errorMessageFa ? (
                  <div className="text-destructive">{row.errorMessageFa}</div>
                ) : null}
              </div>
              <StatusChip
                status={row.status}
                label={syncStatusLabelFa(row.status)}
              />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
