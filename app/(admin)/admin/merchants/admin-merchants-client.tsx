"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ConfirmDialog } from "@/components/composites/confirm-dialog";
import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { SectionHeader } from "@/components/composites/section-header";
import { Button } from "@/components/ui/button";
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
  activateMerchant,
  fetchAdminMerchants,
  merchantStatusLabelFa,
  suspendMerchant,
} from "@/modules/admin/ui";

const fa = ADMIN_UI_COPY_FA;

export function AdminMerchantsClient() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["admin", "merchants"],
    queryFn: fetchAdminMerchants,
  });

  const activate = useMutation({
    mutationFn: activateMerchant,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
    },
  });

  const suspend = useMutation({
    mutationFn: suspendMerchant,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "merchants"] });
    },
  });

  const pending = activate.isPending || suspend.isPending;

  return (
    <section aria-label="جدول فروشندگان" className="flex flex-col gap-4">
      <SectionHeader title="فروشندگان" />

      {list.isLoading ? <LoadingState rows={3} label={fa.loading} /> : null}

      {list.error ? (
        <ErrorState
          description={fa.error}
          onRetry={() => void list.refetch()}
        />
      ) : null}

      {!list.isLoading && !list.error && (list.data?.length ?? 0) === 0 ? (
        <EmptyState title={fa.empty} />
      ) : null}

      {(list.data?.length ?? 0) > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-end">اقدامات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data!.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.tradeName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {merchantStatusLabelFa(row.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <ConfirmDialog
                        title={fa.activate}
                        description={fa.confirmActivate}
                        confirmLabel={fa.activate}
                        onConfirm={() => activate.mutate(row.id)}
                        trigger={
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            disabled={
                              row.status === "active" || pending
                            }
                          >
                            {fa.activate}
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        title={fa.suspend}
                        description={fa.confirmSuspend}
                        confirmLabel={fa.suspend}
                        destructive
                        onConfirm={() => suspend.mutate(row.id)}
                        trigger={
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="min-h-11"
                            disabled={
                              row.status === "suspended" || pending
                            }
                            title={fa.privilegeHint}
                          >
                            {fa.suspend}
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {activate.error || suspend.error ? (
        <ErrorState description={fa.error} />
      ) : null}
    </section>
  );
}
