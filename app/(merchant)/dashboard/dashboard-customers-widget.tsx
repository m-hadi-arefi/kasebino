"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LoadingState } from "@/components/composites/loading-state";
import { SectionHeader } from "@/components/composites/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const loading = storesQuery.isLoading || segmentsQuery.isLoading;

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title={fa.dashboardCustomersTitle}
        description={fa.dashboardCustomersHint}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/customers">{fa.dashboardOpenCrm}</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingState rows={1} label={fa.dashboardLoading} />
          ) : null}

          {!storesQuery.isLoading && (storesQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {fa.dashboardEmptyStore}
            </p>
          ) : null}

          {segmentsQuery.data ? (
            <div className="flex flex-col gap-1 text-sm text-foreground">
              <p>فعال: {segmentsQuery.data.totalActive}</p>
              <p className="text-muted-foreground">
                {segmentLabelFa("new")}: {segmentsQuery.data.counts.new} ·{" "}
                {segmentLabelFa("returning")}:{" "}
                {segmentsQuery.data.counts.returning} ·{" "}
                {segmentLabelFa("lapsed")}: {segmentsQuery.data.counts.lapsed}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
