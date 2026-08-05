"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

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
  const storeId = useId();
  const searchId = useId();
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
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/dashboard"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.backToDashboard}
        </Link>
        <Link
          href="/pos"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openPos}
        </Link>
        <Link
          href="/products"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openProducts}
        </Link>
      </nav>

      <div className="flex flex-col gap-2">
        <label htmlFor={storeId} className="text-sm text-[var(--color-muted)]">
          {fa.storeLabel}
        </label>
        <select
          id={storeId}
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
        >
          {(storesQuery.data ?? []).length === 0 ? (
            <option value="">{fa.storePlaceholder}</option>
          ) : null}
          {(storesQuery.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName}
            </option>
          ))}
        </select>
      </div>

      <div
        role="group"
        aria-label={fa.segmentLabel}
        className="flex flex-wrap gap-2"
      >
        {SEGMENT_FILTERS.map((f) => {
          const pressed = segment === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => setSegment(f.id)}
              className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-2 text-sm ${
                pressed
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={searchId} className="sr-only">
          {fa.searchPhonePlaceholder}
        </label>
        <input
          id={searchId}
          value={phoneQuery}
          onChange={(e) => setPhoneQuery(e.target.value)}
          placeholder={fa.searchPhonePlaceholder}
          inputMode="tel"
          autoComplete="tel"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
        />
      </div>

      {membershipsQuery.isLoading || storesQuery.isLoading ? (
        <p className="text-[var(--color-muted)]" aria-live="polite">
          {fa.loadingCustomers}
        </p>
      ) : null}

      {membershipsQuery.isError ? (
        <p className="text-[var(--color-danger)]" role="alert">
          {(membershipsQuery.error as Error).message || fa.networkError}
        </p>
      ) : null}

      {!membershipsQuery.isLoading &&
      selectedStoreId &&
      filtered.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          {segment === "all" ? fa.emptyCustomers : fa.emptySegment}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {filtered.map((item) => (
          <li key={item.membership.id}>
            <Link
              href={`/customers/${item.membership.id}`}
              className="block min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <p className="font-medium text-[var(--color-fg)]" dir="ltr">
                {item.membership.phoneNational}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {segmentLabelFa(item.engagement.segment)} ·{" "}
                {item.engagement.purchaseCount} خرید ·{" "}
                {formatCrmToman(item.engagement.totalSpendMinor)}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {fa.lastPurchaseLabel}:{" "}
                {formatCrmJalali(item.engagement.lastPurchaseAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
