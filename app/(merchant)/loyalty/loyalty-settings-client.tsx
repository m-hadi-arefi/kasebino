"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import {
  LOYALTY_UI_COPY_FA,
  fetchLoyaltyRule,
  fetchMerchantStores,
  formatLoyaltyToman,
  minorToTomanInput,
  saveLoyaltyRule,
  tomanInputToMinor,
} from "@/modules/loyalty/ui";

const fa = LOYALTY_UI_COPY_FA;

export function LoyaltySettingsClient() {
  const storeSelectId = useId();
  const amountId = useId();
  const pointsId = useId();
  const expiryId = useId();
  const disableId = useId();
  const queryClient = useQueryClient();

  const [storeId, setStoreId] = useState("");
  const [tomanPerPoint, setTomanPerPoint] = useState("10000");
  const [pointsPerUnit, setPointsPerUnit] = useState("1");
  const [expiryMonths, setExpiryMonths] = useState("12");
  const [expiryDisabled, setExpiryDisabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const storesQuery = useQuery({
    queryKey: ["loyalty", "stores"],
    queryFn: fetchMerchantStores,
    staleTime: 60_000,
  });

  useEffect(() => {
    const first = storesQuery.data?.[0];
    if (first && !storeId) setStoreId(first.id);
  }, [storesQuery.data, storeId]);

  const ruleQuery = useQuery({
    queryKey: ["loyalty", "rule", storeId],
    queryFn: () => fetchLoyaltyRule(storeId),
    enabled: Boolean(storeId),
  });

  useEffect(() => {
    if (ruleQuery.data) {
      setTomanPerPoint(minorToTomanInput(ruleQuery.data.amountMinorPerPoint));
      setPointsPerUnit(String(ruleQuery.data.pointsPerUnit));
      if (ruleQuery.data.expiryMonthsAfterLastEarn === null) {
        setExpiryDisabled(true);
        setExpiryMonths("12");
      } else {
        setExpiryDisabled(false);
        setExpiryMonths(String(ruleQuery.data.expiryMonthsAfterLastEarn));
      }
      setStatusMessage(null);
    } else if (ruleQuery.isSuccess && ruleQuery.data === null) {
      setTomanPerPoint("10000");
      setPointsPerUnit("1");
      setExpiryMonths("12");
      setExpiryDisabled(false);
      setStatusMessage(fa.defaultRuleHint);
    }
  }, [ruleQuery.data, ruleQuery.isSuccess]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const minor = tomanInputToMinor(tomanPerPoint);
      if (minor === null || minor < 10n) {
        throw new Error("مبلغ تومان معتبر نیست.");
      }
      const points = Number.parseInt(pointsPerUnit, 10);
      if (!Number.isInteger(points) || points < 1) {
        throw new Error("تعداد امتیاز معتبر نیست.");
      }
      const months = Number.parseInt(expiryMonths, 10);
      if (!expiryDisabled && (!Number.isInteger(months) || months < 1)) {
        throw new Error("ماه انقضا معتبر نیست.");
      }
      return saveLoyaltyRule({
        storeId,
        amountMinorPerPoint: minor.toString(),
        pointsPerUnit: points,
        expiryMonthsAfterLastEarn: expiryDisabled ? null : months,
      });
    },
    onSuccess: async () => {
      setStatusMessage(fa.saved);
      await queryClient.invalidateQueries({ queryKey: ["loyalty", "rule", storeId] });
    },
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
          href="/customers"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openCustomers}
        </Link>
      </nav>

      <label className="flex flex-col gap-2 text-sm" htmlFor={storeSelectId}>
        <span>{fa.storeLabel}</span>
        <select
          id={storeSelectId}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          disabled={storesQuery.isLoading}
        >
          {(storesQuery.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName}
            </option>
          ))}
        </select>
      </label>

      {ruleQuery.isLoading ? (
        <p className="text-[var(--color-muted)]" aria-live="polite">
          {fa.loadRule}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}

      {saveMutation.isError ? (
        <p className="text-[var(--color-danger)]" role="alert">
          {(saveMutation.error as Error).message || fa.networkError}
        </p>
      ) : null}

      <section
        aria-label={fa.settingsTitle}
        className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
      >
        <label className="flex flex-col gap-2 text-sm" htmlFor={amountId}>
          <span>{fa.amountTomanLabel}</span>
          <input
            id={amountId}
            inputMode="numeric"
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3"
            value={tomanPerPoint}
            onChange={(e) => setTomanPerPoint(e.target.value)}
          />
          <span className="text-[var(--color-muted)]">{fa.amountHint}</span>
          {tomanInputToMinor(tomanPerPoint) !== null ? (
            <span className="text-xs text-[var(--color-muted)]">
              = {formatLoyaltyToman(tomanInputToMinor(tomanPerPoint)!)} برای هر{" "}
              {pointsPerUnit || "1"} {fa.pointsUnit}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm" htmlFor={pointsId}>
          <span>{fa.pointsPerUnitLabel}</span>
          <input
            id={pointsId}
            inputMode="numeric"
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3"
            value={pointsPerUnit}
            onChange={(e) => setPointsPerUnit(e.target.value)}
          />
        </label>

        <label className="flex min-h-11 items-center gap-3 text-sm" htmlFor={disableId}>
          <input
            id={disableId}
            type="checkbox"
            checked={expiryDisabled}
            onChange={(e) => setExpiryDisabled(e.target.checked)}
          />
          <span>{fa.expiryDisabledLabel}</span>
        </label>

        <label className="flex flex-col gap-2 text-sm" htmlFor={expiryId}>
          <span>{fa.expiryMonthsLabel}</span>
          <input
            id={expiryId}
            inputMode="numeric"
            disabled={expiryDisabled}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 disabled:opacity-50"
            value={expiryMonths}
            onChange={(e) => setExpiryMonths(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-[var(--color-primary-fg)] disabled:opacity-60"
          disabled={!storeId || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? fa.saving : fa.save}
        </button>
      </section>
    </div>
  );
}
