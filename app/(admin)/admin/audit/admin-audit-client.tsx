"use client";

import { useQuery } from "@tanstack/react-query";

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
    <section aria-label="فهرست حسابرسی" className="flex flex-col gap-3">
      {audit.isLoading ? (
        <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
          {fa.auditLoading}
        </p>
      ) : null}

      {audit.error ? (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {fa.auditError}
        </p>
      ) : null}

      {!audit.isLoading && (audit.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{fa.auditEmpty}</p>
      ) : null}

      {(audit.data?.length ?? 0) > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  {fa.timeCol}
                </th>
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  {fa.actionCol}
                </th>
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  {fa.merchantCol}
                </th>
                <th className="px-3 py-3 font-medium text-[var(--color-fg)]">
                  {fa.resultCol}
                </th>
              </tr>
            </thead>
            <tbody>
              {audit.data!.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)]"
                >
                  <td className="px-3 py-3 text-[var(--color-muted)]">
                    {formatAdminJalali(row.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-fg)]">
                    {row.action}
                    {row.reasonFa ? (
                      <span className="mt-1 block text-xs text-[var(--color-muted)]">
                        {row.reasonFa}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-muted)]">
                    {row.merchantId ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-muted)]">
                    {row.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
