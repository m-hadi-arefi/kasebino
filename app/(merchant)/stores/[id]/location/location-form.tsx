"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";

import { FormSection } from "@/components/composites/form-section";
import { PageHeader } from "@/components/composites/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STORE_LOCATION_UI_COPY_FA,
  fetchMerchantStore,
  patchStoreLocation,
  type MerchantStoreDto,
} from "@/modules/store/ui";

const fa = STORE_LOCATION_UI_COPY_FA;

type Props = {
  storeId: string;
};

export function StoreLocationForm({ storeId }: Props) {
  const [store, setStore] = useState<MerchantStoreDto | null>(null);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await fetchMerchantStore(storeId);
        if (cancelled) return;
        setStore(s);
        setLine1(s.address.line1);
        setLine2(s.address.line2 ?? "");
        setCity(s.address.city);
        setProvince(s.address.province);
        setPostalCode(s.address.postalCode ?? "");
        setLatitude(String(s.address.latitude));
        setLongitude(String(s.address.longitude));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : fa.loadError);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError(fa.invalidGeo);
      return;
    }
    startTransition(async () => {
      try {
        const updated = await patchStoreLocation({
          storeId,
          address: {
            line1,
            line2: line2.trim() || null,
            city,
            province,
            postalCode: postalCode.trim() || null,
            latitude: lat,
            longitude: lng,
          },
        });
        setStore(updated);
        setSuccess(fa.saveSuccess);
      } catch (err) {
        setError(err instanceof Error ? err.message : fa.networkError);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fa.locationTitle}
        description={
          store
            ? `${fa.locationSubtitle} · ${store.branding.displayName} · /s/${store.slug}`
            : fa.locationSubtitle
        }
        breadcrumbs={[
          { label: "فروشگاه‌ها", href: "/stores" },
          { label: fa.locationTitle },
        ]}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription aria-live="polite">{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert>
          <AlertDescription aria-live="polite">{success}</AlertDescription>
        </Alert>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <FormSection title={fa.locationTitle}>
          <div className="space-y-2">
            <Label>{fa.line1Label}</Label>
            <Input
              dir="rtl"
              value={line1}
              onChange={(ev) => setLine1(ev.target.value)}
              required
              autoComplete="street-address"
            />
          </div>
          <div className="space-y-2">
            <Label>{fa.line2Label}</Label>
            <Input
              dir="rtl"
              value={line2}
              onChange={(ev) => setLine2(ev.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{fa.cityLabel}</Label>
              <Input
                dir="rtl"
                value={city}
                onChange={(ev) => setCity(ev.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{fa.provinceLabel}</Label>
              <Input
                dir="rtl"
                value={province}
                onChange={(ev) => setProvince(ev.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{fa.postalCodeLabel}</Label>
            <Input
              inputMode="numeric"
              value={postalCode}
              onChange={(ev) => setPostalCode(ev.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{fa.latitudeLabel}</Label>
              <Input
                inputMode="decimal"
                value={latitude}
                onChange={(ev) => setLatitude(ev.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{fa.longitudeLabel}</Label>
              <Input
                inputMode="decimal"
                value={longitude}
                onChange={(ev) => setLongitude(ev.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={pending || !store} className="w-full">
            {pending ? fa.saving : fa.saveCta}
          </Button>
        </FormSection>
      </form>

      <Button variant="outline" asChild>
        <Link href={`/stores/${encodeURIComponent(storeId)}/qr`}>
          {fa.qrNav}
        </Link>
      </Button>
    </div>
  );
}
