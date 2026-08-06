"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_UI_COPY_FA,
  fetchAdminAudit,
  formatAdminJalali,
} from "@/modules/admin/ui";

const fa = ADMIN_UI_COPY_FA;

export function AdminAuditClient() {
  const audit = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: fetchAdminAudit,
  });

  return (
    <section aria-label="فهرست حسابرسی" className="flex flex-col gap-4">
      {audit.isLoading ? (
        <LoadingState rows={4} label={fa.auditLoading} />
      ) : null}

      {audit.error ? (
        <ErrorState
          description={fa.auditError}
          onRetry={() => void audit.refetch()}
        />
      ) : null}

      {!audit.isLoading && !audit.error && (audit.data?.length ?? 0) === 0 ? (
        <EmptyState title={fa.auditEmpty} />
      ) : null}

      {(audit.data?.length ?? 0) > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{fa.timeCol}</TableHead>
                <TableHead>{fa.actionCol}</TableHead>
                <TableHead>{fa.merchantCol}</TableHead>
                <TableHead>{fa.resultCol}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.data!.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {formatAdminJalali(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    {row.action}
                    {row.reasonFa ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {row.reasonFa}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.merchantId ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.result}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  );
}
