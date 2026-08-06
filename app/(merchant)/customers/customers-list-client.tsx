"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { FilterBar } from "@/components/composites/filter-bar";
import { LoadingState } from "@/components/composites/loading-state";
import { SearchInput } from "@/components/composites/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmSegment } from "@/modules/crm/domain/segments";
import {
  CRM_UI_COPY_FA,
  fetchMemberships,
  fetchMerchantStores,
  formatCrmJalali,
  formatCrmToman,
  segmentLabelFa,
} from "@/modules/crm/ui";

const fa = CRM_UI_COPY_FA;

type SegmentFilter = CrmSegment | "all";

const SEGMENT_FILTERS: { id: SegmentFilter; label: string }[] = [
  { id: "all", label: fa.segmentAll },
  { id: "new", label: fa.segmentNew },
  { id: "returning", label: fa.segmentReturning },
  { id: "lapsed", label: fa.segmentLapsed },
];

export function CustomersListClient() {
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [debouncedPhone, setDebouncedPhone] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedPhone(phoneQuery.trim()), 150);
    return () => window.clearTimeout(t);
  }, [phoneQuery]);

  const storesQuery = useQuery({
    queryKey: ["crm", "stores"],
    queryFn: fetchMerchantStores,
  });

  useEffect(() => {
    if (!selectedStoreId && (storesQuery.data?.length ?? 0) > 0) {
      setSelectedStoreId(storesQuery.data![0]!.id);
    }
  }, [selectedStoreId, storesQuery.data]);

  const membershipsQuery = useQuery({
    queryKey: ["crm", "memberships", selectedStoreId, segment],
    queryFn: () =>
      fetchMemberships({
        storeId: selectedStoreId,
        segment,
      }),
    enabled: Boolean(selectedStoreId),
  });

  const filtered = (membershipsQuery.data ?? []).filter((item) => {
    if (!debouncedPhone) return true;
    return item.membership.phoneNational.includes(
      debouncedPhone.replace(/\D/g, ""),
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="crm-store-select">{fa.storeLabel}</Label>
        <Select
          value={selectedStoreId}
          onValueChange={setSelectedStoreId}
        >
          <SelectTrigger id="crm-store-select">
            <SelectValue placeholder={fa.storePlaceholder} />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {(storesQuery.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div role="group" aria-label={fa.segmentLabel}>
      <FilterBar>
        {SEGMENT_FILTERS.map((f) => {
          const pressed = segment === f.id;
          return (
            <Button
              key={f.id}
              type="button"
              variant={pressed ? "default" : "outline"}
              size="sm"
              aria-pressed={pressed}
              onClick={() => setSegment(f.id)}
            >
              {f.label}
            </Button>
          );
        })}
      </FilterBar>
      </div>

      <SearchInput
        value={phoneQuery}
        onChange={(e) => setPhoneQuery(e.target.value)}
        placeholder={fa.searchPhonePlaceholder}
        inputMode="tel"
        autoComplete="tel"
        containerClassName="max-w-none"
      />

      {membershipsQuery.isLoading || storesQuery.isLoading ? (
        <LoadingState rows={3} label={fa.loadingCustomers} />
      ) : null}

      {membershipsQuery.isError ? (
        <ErrorState
          title={(membershipsQuery.error as Error).message || fa.networkError}
        />
      ) : null}

      {!membershipsQuery.isLoading &&
      selectedStoreId &&
      filtered.length === 0 ? (
        <EmptyState
          title={segment === "all" ? fa.emptyCustomers : fa.emptySegment}
        />
      ) : null}

      <ul className="flex flex-col gap-3">
        {filtered.map((item) => (
          <li key={item.membership.id}>
            <Card className="transition-shadow hover:shadow-md">
              <Link href={`/customers/${item.membership.id}`}>
                <CardContent className="py-4">
                  <p className="font-medium text-foreground" dir="ltr">
                    {item.membership.phoneNational}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {segmentLabelFa(item.engagement.segment)} ·{" "}
                    {item.engagement.purchaseCount} خرید ·{" "}
                    {formatCrmToman(item.engagement.totalSpendMinor)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fa.lastPurchaseLabel}:{" "}
                    {formatCrmJalali(item.engagement.lastPurchaseAt)}
                  </p>
                </CardContent>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
