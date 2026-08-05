"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {fa.backDashboard}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.locationTitle}
        </h1>
        <p className="text-[var(--color-muted)]">{fa.locationSubtitle}</p>
        {store ? (
          <p className="text-sm text-[var(--color-muted)]">
            {store.branding.displayName} · /s/{store.slug}
          </p>
        ) : null}
      </header>

      <p aria-live="polite" className="min-h-6 text-sm text-[var(--color-danger)]">
        {error}
      </p>
      {success ? (
        <p
          aria-live="polite"
          className="text-sm text-[var(--color-success)]"
        >
          {success}
        </p>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <label className="flex flex-col gap-1.5 text-sm">
          <span>{fa.line1Label}</span>
          <input
            dir="rtl"
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
            value={line1}
            onChange={(ev) => setLine1(ev.target.value)}
            required
            autoComplete="street-address"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span>{fa.line2Label}</span>
          <input
            dir="rtl"
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
            value={line2}
            onChange={(ev) => setLine2(ev.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{fa.cityLabel}</span>
            <input
              dir="rtl"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={city}
              onChange={(ev) => setCity(ev.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{fa.provinceLabel}</span>
            <input
              dir="rtl"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={province}
              onChange={(ev) => setProvince(ev.target.value)}
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span>{fa.postalCodeLabel}</span>
          <input
            inputMode="numeric"
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
            value={postalCode}
            onChange={(ev) => setPostalCode(ev.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{fa.latitudeLabel}</span>
            <input
              inputMode="decimal"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={latitude}
              onChange={(ev) => setLatitude(ev.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{fa.longitudeLabel}</span>
            <input
              inputMode="decimal"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={longitude}
              onChange={(ev) => setLongitude(ev.target.value)}
              required
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending || !store}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 font-medium text-[var(--color-primary-fg)] disabled:opacity-60"
        >
          {pending ? fa.saving : fa.saveCta}
        </button>
      </form>

      <Link
        href={`/stores/${encodeURIComponent(storeId)}/qr`}
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-fg)]"
      >
        {fa.qrNav}
      </Link>
    </main>
  );
}
