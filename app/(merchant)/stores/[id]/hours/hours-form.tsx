"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { FormSection } from "@/components/composites/form-section";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { PageHeader } from "@/components/composites/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  STORE_HOURS_UI_COPY_FA,
  fetchMerchantStore,
  patchStoreHours,
  type DayHoursDto,
  type StoreHoursDto,
} from "@/modules/store/ui";

const fa = STORE_HOURS_UI_COPY_FA;

const WEEKDAYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

const DEFAULT_OPEN: DayHoursDto = { open: "09:00", close: "21:00" };

function emptyHours(): StoreHoursDto {
  return {
    saturday: { ...DEFAULT_OPEN },
    sunday: { ...DEFAULT_OPEN },
    monday: { ...DEFAULT_OPEN },
    tuesday: { ...DEFAULT_OPEN },
    wednesday: { ...DEFAULT_OPEN },
    thursday: { ...DEFAULT_OPEN },
    friday: { open: "09:00", close: "13:00" },
  };
}

type StoreHoursFormProps = {
  storeId: string;
};

export function StoreHoursForm({ storeId }: StoreHoursFormProps) {
  const [hours, setHours] = useState<StoreHoursDto>(emptyHours());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const store = await fetchMerchantStore(storeId);
        if (cancelled) return;
        setStoreName(store.branding.displayName);
        if (store.hours) {
          setHours({
            saturday: store.hours.saturday,
            sunday: store.hours.sunday,
            monday: store.hours.monday,
            tuesday: store.hours.tuesday,
            wednesday: store.hours.wednesday,
            thursday: store.hours.thursday,
            friday: store.hours.friday,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : fa.loadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  async function onSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await patchStoreHours({ storeId, hours });
      setSuccess(fa.saveSuccess);
    } catch (e) {
      setError(e instanceof Error ? e.message : fa.networkError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState rows={3} label={fa.title} />;
  }

  if (error && !storeName) {
    return <ErrorState title={error} />;
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <PageHeader
        title={fa.title}
        description={`${fa.subtitle}${storeName ? ` · ${storeName}` : ""}`}
      />

      <Button variant="outline" size="sm" className="w-fit" asChild>
        <Link href="/stores">{fa.backStores}</Link>
      </Button>

      <FormSection title={fa.title}>
        <ul className="flex flex-col gap-4">
          {WEEKDAYS.map((day) => {
            const slot = hours[day];
            const open = slot != null;
            return (
              <li
                key={day}
                className="flex flex-col gap-3 rounded-md border border-border p-3"
              >
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <span className="font-medium">{fa.weekday[day]}</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`open-${day}`} className="text-sm">
                      {open ? fa.dayOpen : fa.closed}
                    </Label>
                    <Switch
                      id={`open-${day}`}
                      checked={open}
                      onCheckedChange={(checked) => {
                        setHours((prev) => ({
                          ...prev,
                          [day]: checked ? { ...DEFAULT_OPEN } : null,
                        }));
                      }}
                    />
                  </div>
                </div>
                {open && slot ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${day}-open`}>{fa.openLabel}</Label>
                      <Input
                        id={`${day}-open`}
                        type="time"
                        value={slot.open}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [day]: { ...slot, open: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${day}-close`}>{fa.closeLabel}</Label>
                      <Input
                        id={`${day}-close`}
                        type="time"
                        value={slot.close}
                        onChange={(e) =>
                          setHours((prev) => ({
                            ...prev,
                            [day]: { ...slot, close: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <Button
          type="button"
          className="mt-4 min-h-11"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? fa.saving : fa.saveCta}
        </Button>
      </FormSection>

      <div aria-live="polite" className="flex flex-col gap-2">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
