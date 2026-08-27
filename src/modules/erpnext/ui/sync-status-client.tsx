"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { StatusChip } from "@/components/composites/status-chip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { fetchFinanceSyncRecords, retryFinanceSync } from "./api.js";
import { ERPNEXT_FINANCE_UI_COPY_FA } from "./copy.js";
import { formatFinanceJalali, syncStatusLabelFa } from "./format.js";

const fa = ERPNEXT_FINANCE_UI_COPY_FA;

export function FinanceSyncStatusClient() {
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["erpnext", "finance", "sync"],
    queryFn: () => fetchFinanceSyncRecords(),
  });

  const retryMutation = useMutation({
    mutationFn: (syncRecordId: string) => retryFinanceSync({ syncRecordId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erpnext", "finance", "sync"] });
      queryClient.invalidateQueries({ queryKey: ["erpnext", "finance", "dashboard"] });
    },
    onSettled: () => {
      setRetryingId(null);
    },
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
                  <div className="text-destructive font-medium mt-1">{row.errorMessageFa}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {row.status === "failed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={retryMutation.isPending && retryingId === row.id}
                    onClick={() => {
                      setRetryingId(row.id);
                      retryMutation.mutate(row.id);
                    }}
                  >
                    {retryMutation.isPending && retryingId === row.id
                      ? "در حال ارسال..."
                      : "تلاش مجدد"}
                  </Button>
                ) : null}
                <StatusChip
                  status={row.status}
                  label={syncStatusLabelFa(row.status)}
                />
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
