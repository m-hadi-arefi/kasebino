"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

  return (
    <section aria-label="جدول فروشندگان" className="flex flex-col gap-3">
      <h2 className="text-lg font-medium text-[var(--color-fg)]">فروشندگان</h2>

      {list.isLoading ? (
        <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
          {fa.loading}
        </p>
      ) : null}

      {list.error ? (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {fa.error}
        </p>
      ) : null}

      {!list.isLoading && (list.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{fa.empty}</p>
      ) : null}

      {(list.data?.length ?? 0) > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  نام
                </th>
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  وضعیت
                </th>
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  اقدامات
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data!.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)]"
                >
                  <td className="px-3 py-3 text-[var(--color-fg)]">
                    {row.tradeName}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-muted)]">
                    {merchantStatusLabelFa(row.status)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-fg)] disabled:opacity-50"
                        disabled={
                          row.status === "active" ||
                          activate.isPending ||
                          suspend.isPending
                        }
                        title={fa.confirmActivate}
                        onClick={() => {
                          if (window.confirm(fa.confirmActivate)) {
                            activate.mutate(row.id);
                          }
                        }}
                      >
                        {fa.activate}
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-fg)] disabled:opacity-50"
                        disabled={
                          row.status === "suspended" ||
                          activate.isPending ||
                          suspend.isPending
                        }
                        title={fa.privilegeHint}
                        onClick={() => {
                          if (window.confirm(fa.confirmSuspend)) {
                            suspend.mutate(row.id);
                          }
                        }}
                      >
                        {fa.suspend}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {(activate.error || suspend.error) && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {fa.error}
        </p>
      )}
    </section>
  );
}
