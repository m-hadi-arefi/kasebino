"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CRM_UI_COPY_FA,
  fetchMerchantStores,
  fetchStoreSegments,
  segmentLabelFa,
} from "@/modules/crm/ui";

const fa = CRM_UI_COPY_FA;

export function DashboardCustomersWidget() {
  const [storeId, setStoreId] = useState("");

  const storesQuery = useQuery({
    queryKey: ["crm", "stores"],
    queryFn: fetchMerchantStores,
  });

  useEffect(() => {
    if (!storeId && (storesQuery.data?.length ?? 0) > 0) {
      setStoreId(storesQuery.data![0]!.id);
    }
  }, [storeId, storesQuery.data]);

  const segmentsQuery = useQuery({
    queryKey: ["crm", "segments", storeId],
    queryFn: () => fetchStoreSegments(storeId),
    enabled: Boolean(storeId),
  });

  return (
    <li className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="font-medium text-[var(--color-fg)]">
        {fa.dashboardCustomersTitle}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {fa.dashboardCustomersHint}
      </p>

      {storesQuery.isLoading || segmentsQuery.isLoading ? (
        <p className="mt-2 text-sm text-[var(--color-muted)]" aria-live="polite">
          {fa.dashboardLoading}
        </p>
      ) : null}

      {!storesQuery.isLoading && (storesQuery.data?.length ?? 0) === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {fa.dashboardEmptyStore}
        </p>
      ) : null}

      {segmentsQuery.data ? (
        <div className="mt-2 flex flex-col gap-1 text-sm text-[var(--color-fg)]">
          <p>فعال: {segmentsQuery.data.totalActive}</p>
          <p>
            {segmentLabelFa("new")}: {segmentsQuery.data.counts.new} ·{" "}
            {segmentLabelFa("returning")}:{" "}
            {segmentsQuery.data.counts.returning} ·{" "}
            {segmentLabelFa("lapsed")}: {segmentsQuery.data.counts.lapsed}
          </p>
        </div>
      ) : null}

      <Link
        href="/customers"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[var(--color-primary)]"
      >
        {fa.dashboardOpenCrm}
      </Link>
    </li>
  );
}
