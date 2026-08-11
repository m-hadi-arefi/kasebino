"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { SectionHeader } from "@/components/composites/section-header";
import { Card, CardContent } from "@/components/ui/card";

import { fetchCustomerFinancialOverview } from "./api.js";
import { ERPNEXT_FINANCE_UI_COPY_FA } from "./copy.js";
import { formatFinanceJalali } from "./format.js";

const fa = ERPNEXT_FINANCE_UI_COPY_FA;

/**
 * Customer financial overview — separate from CRM engagement and loyalty.
 */
export function CustomerFinancePanel({ customerId }: { customerId: string }) {
  const query = useQuery({
    queryKey: ["erpnext", "finance", "customer", customerId],
    queryFn: () => fetchCustomerFinancialOverview(customerId),
    enabled: Boolean(customerId),
  });

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={fa.customerFinanceTitle}
        description={fa.customerFinanceHint}
      />
      {query.isLoading ? (
        <LoadingState rows={2} label={fa.loading} />
      ) : query.isError || !query.data ? (
        <ErrorState
          title={(query.error as Error | null)?.message || fa.networkError}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 text-sm">
            <div>
              <div className="text-muted-foreground">{fa.outstanding}</div>
              <div className="text-lg font-semibold">
                {query.data.outstanding.displayToman}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{fa.creditStatus}</div>
              <div>{query.data.creditStatusFa}</div>
            </div>
            <div>
              <div className="mb-1 font-medium">{fa.invoices}</div>
              {query.data.invoices.length === 0 ? (
                <p className="text-muted-foreground">{fa.emptyInvoices}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {query.data.invoices.map((inv) => (
                    <li key={inv.externalId} className="flex justify-between items-center bg-muted/30 p-2 rounded">
                      <span className="font-mono text-xs">{inv.externalId}</span>
                      <span>{inv.grandTotal.displayToman}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFinanceJalali(inv.postingDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="mb-1 font-medium">{fa.payments}</div>
              {query.data.payments.length === 0 ? (
                <p className="text-muted-foreground">—</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {query.data.payments.map((p) => (
                    <li key={p.externalId} className="flex justify-between items-center bg-muted/30 p-2 rounded">
                      <span className="font-mono text-xs">{p.externalId}</span>
                      <span className="text-emerald-600">{p.amount.displayToman}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFinanceJalali(p.postingDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

