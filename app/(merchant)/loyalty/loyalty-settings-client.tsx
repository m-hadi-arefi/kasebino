"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";

import { FormSection } from "@/components/composites/form-section";
import { LoadingState } from "@/components/composites/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <div className="space-y-2">
        <Label htmlFor="loyalty-store">{fa.storeLabel}</Label>
        <Select
          value={storeId}
          onValueChange={setStoreId}
          disabled={storesQuery.isLoading}
        >
          <SelectTrigger id="loyalty-store">
            <SelectValue placeholder={fa.storeLabel} />
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

      {ruleQuery.isLoading ? (
        <LoadingState rows={1} label={fa.loadRule} />
      ) : null}

      {statusMessage ? (
        <Alert>
          <AlertDescription aria-live="polite">{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      {saveMutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription role="alert">
            {(saveMutation.error as Error).message || fa.networkError}
          </AlertDescription>
        </Alert>
      ) : null}

      <FormSection title={fa.settingsTitle}>
        <div className="space-y-2">
          <Label htmlFor={amountId}>{fa.amountTomanLabel}</Label>
          <Input
            id={amountId}
            inputMode="numeric"
            value={tomanPerPoint}
            onChange={(e) => setTomanPerPoint(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">{fa.amountHint}</p>
          {tomanInputToMinor(tomanPerPoint) !== null ? (
            <p className="text-xs text-muted-foreground">
              = {formatLoyaltyToman(tomanInputToMinor(tomanPerPoint)!)} برای هر{" "}
              {pointsPerUnit || "1"} {fa.pointsUnit}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={pointsId}>{fa.pointsPerUnitLabel}</Label>
          <Input
            id={pointsId}
            inputMode="numeric"
            value={pointsPerUnit}
            onChange={(e) => setPointsPerUnit(e.target.value)}
          />
        </div>

        <div className="flex min-h-11 items-center gap-3">
          <Checkbox
            id={disableId}
            checked={expiryDisabled}
            onCheckedChange={(checked) =>
              setExpiryDisabled(checked === true)
            }
          />
          <Label htmlFor={disableId}>{fa.expiryDisabledLabel}</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor={expiryId}>{fa.expiryMonthsLabel}</Label>
          <Input
            id={expiryId}
            inputMode="numeric"
            disabled={expiryDisabled}
            value={expiryMonths}
            onChange={(e) => setExpiryMonths(e.target.value)}
          />
        </div>

        <Button
          type="button"
          disabled={!storeId || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? fa.saving : fa.save}
        </Button>
      </FormSection>
    </div>
  );
}
