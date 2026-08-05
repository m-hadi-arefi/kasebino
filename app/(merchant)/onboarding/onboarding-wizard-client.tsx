"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { uploadStoreBrandingAsset } from "@/modules/store/ui";
import {
  ONBOARDING_UI_COPY_FA,
  completeOnboarding,
  createMerchant,
  createMerchantStore,
  fetchOnboardingStatus,
  patchStoreBranding,
  type OnboardingStatusDto,
} from "@/modules/merchant/ui";

const fa = ONBOARDING_UI_COPY_FA;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

type Step = "merchant" | "store" | "branding" | "ready";

export function OnboardingWizardClient() {
  const router = useRouter();
  const [status, setStatus] = useState<OnboardingStatusDto | null>(null);
  const [step, setStep] = useState<Step>("merchant");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [tradeName, setTradeName] = useState("");
  const [merchantSlug, setMerchantSlug] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("کرمان");
  const [province, setProvince] = useState("کرمان");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("30.2839");
  const [longitude, setLongitude] = useState("57.0834");

  const [primaryColor, setPrimaryColor] = useState("#0f766e");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await fetchOnboardingStatus();
        if (cancelled) return;
        setStatus(s);
        setStep(s.step);
        if (s.merchant) {
          setTradeName(s.merchant.tradeName);
          setMerchantSlug(s.merchant.slug);
        }
        if (s.store) {
          setStoreId(s.store.id);
          setDisplayName(s.store.branding.displayName);
          setStoreSlug(s.store.slug);
          setLine1(s.store.address.line1);
          setLine2(s.store.address.line2 ?? "");
          setCity(s.store.address.city);
          setProvince(s.store.address.province);
          setPostalCode(s.store.address.postalCode ?? "");
          setLatitude(String(s.store.address.latitude));
          setLongitude(String(s.store.address.longitude));
          if (s.store.branding.primaryColor) {
            setPrimaryColor(s.store.branding.primaryColor);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : fa.loadError);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onMerchantSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!SLUG_RE.test(merchantSlug.trim().toLowerCase())) {
      setError(fa.invalidSlug);
      return;
    }
    startTransition(async () => {
      try {
        await createMerchant({
          tradeName,
          slug: merchantSlug.trim().toLowerCase(),
          contactPhone: contactPhone.trim() || null,
        });
        const s = await fetchOnboardingStatus();
        setStatus(s);
        setStep("store");
        if (!displayName) setDisplayName(tradeName);
        if (!storeSlug) setStoreSlug(merchantSlug.trim().toLowerCase());
      } catch (err) {
        setError(err instanceof Error ? err.message : fa.networkError);
      }
    });
  }

  function onStoreSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!SLUG_RE.test(storeSlug.trim().toLowerCase())) {
      setError(fa.invalidSlug);
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("مختصات جغرافیایی معتبر نیست.");
      return;
    }
    startTransition(async () => {
      try {
        if (storeId) {
          setStep("branding");
          return;
        }
        const store = await createMerchantStore({
          slug: storeSlug.trim().toLowerCase(),
          displayName,
          address: {
            line1,
            line2: line2.trim() || null,
            city,
            province,
            postalCode: postalCode.trim() || null,
            latitude: lat,
            longitude: lng,
          },
          primaryColor: null,
        });
        setStoreId(store.id);
        const s = await fetchOnboardingStatus();
        setStatus(s);
        setStep("branding");
      } catch (err) {
        setError(err instanceof Error ? err.message : fa.networkError);
      }
    });
  }

  function onBrandingSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!HEX.test(primaryColor.trim())) {
      setError(fa.invalidColor);
      return;
    }
    if (!storeId) {
      setError(fa.networkError);
      return;
    }
    startTransition(async () => {
      try {
        await patchStoreBranding({
          storeId,
          primaryColor: primaryColor.trim().toLowerCase(),
        });
        if (logoFile) {
          await uploadStoreBrandingAsset({
            storeId,
            kind: "logo",
            file: logoFile,
          });
        }
        const s = await fetchOnboardingStatus();
        setStatus(s);
        setStep("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : fa.networkError);
      }
    });
  }

  function onSkipLogo() {
    setError(null);
    if (!storeId) return;
    startTransition(async () => {
      try {
        if (HEX.test(primaryColor.trim())) {
          await patchStoreBranding({
            storeId,
            primaryColor: primaryColor.trim().toLowerCase(),
          });
        }
        const s = await fetchOnboardingStatus();
        setStatus(s);
        setStep("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : fa.networkError);
      }
    });
  }

  function onFinish() {
    setError(null);
    startTransition(async () => {
      try {
        const done = await completeOnboarding();
        router.replace("/dashboard");
        router.refresh();
        void done;
      } catch (err) {
        setError(err instanceof Error ? err.message : fa.networkError);
      }
    });
  }

  const steps: Step[] = ["merchant", "store", "branding", "ready"];
  const stepLabels: Record<Step, string> = {
    merchant: fa.stepMerchant,
    store: fa.stepStore,
    branding: fa.stepBranding,
    ready: fa.stepReady,
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.title}
        </h1>
        <p className="text-[var(--color-muted)]">{fa.subtitle}</p>
        {status && !status.complete ? (
          <p className="text-sm text-[var(--color-muted)]">{fa.resumeHint}</p>
        ) : null}
      </header>

      <ol
        aria-label="مراحل راه‌اندازی"
        className="flex flex-wrap gap-2 text-sm"
      >
        {steps.map((s) => (
          <li
            key={s}
            className={
              s === step
                ? "rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-[var(--color-primary-fg,#fff)]"
                : "rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-muted)]"
            }
          >
            {stepLabels[s]}
          </li>
        ))}
      </ol>

      <p aria-live="polite" className="min-h-6 text-sm text-[var(--color-danger)]">
        {error}
      </p>

      {!status ? (
        <p className="text-[var(--color-muted)]">{fa.loading}</p>
      ) : null}

      {status && step === "merchant" ? (
        <form className="flex flex-col gap-4" onSubmit={onMerchantSubmit}>
          <label className="flex flex-col gap-2 text-sm">
            <span>{fa.tradeNameLabel}</span>
            <input
              required
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
            />
            <span className="text-[var(--color-muted)]">{fa.tradeNameHint}</span>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>{fa.merchantSlugLabel}</span>
            <input
              dir="ltr"
              required
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={merchantSlug}
              onChange={(e) => setMerchantSlug(e.target.value)}
            />
            <span className="text-[var(--color-muted)]">{fa.merchantSlugHint}</span>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>{fa.contactPhoneLabel}</span>
            <input
              dir="ltr"
              inputMode="tel"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-[var(--color-primary-fg,#fff)]"
          >
            {pending ? fa.saving : fa.nextCta}
          </button>
        </form>
      ) : null}

      {status && step === "store" ? (
        <form className="flex flex-col gap-4" onSubmit={onStoreSubmit}>
          <label className="flex flex-col gap-2 text-sm">
            <span>{fa.storeDisplayNameLabel}</span>
            <input
              required
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>{fa.storeSlugLabel}</span>
            <input
              dir="ltr"
              required
              disabled={Boolean(storeId)}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base disabled:opacity-60"
              value={storeSlug}
              onChange={(e) => setStoreSlug(e.target.value)}
            />
            <span className="text-[var(--color-muted)]">{fa.storeSlugHint}</span>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>آدرس (خیابان و پلاک)</span>
            <input
              required
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>توضیح تکمیلی (اختیاری)</span>
            <input
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-sm">
              <span>شهر</span>
              <input
                required
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>استان</span>
              <input
                required
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm">
            <span>کد پستی (اختیاری)</span>
            <input
              dir="ltr"
              inputMode="numeric"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-sm">
              <span>عرض جغرافیایی</span>
              <input
                dir="ltr"
                inputMode="decimal"
                required
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>طول جغرافیایی</span>
              <input
                dir="ltr"
                inputMode="decimal"
                required
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-[var(--color-primary-fg,#fff)]"
          >
            {pending ? fa.saving : fa.nextCta}
          </button>
        </form>
      ) : null}

      {status && step === "branding" ? (
        <form className="flex flex-col gap-4" onSubmit={onBrandingSubmit}>
          <label className="flex flex-col gap-2 text-sm">
            <span>{fa.primaryColorLabel}</span>
            <input
              dir="ltr"
              required
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <span className="text-[var(--color-muted)]">{fa.primaryColorHint}</span>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>{fa.logoLabel}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="min-h-11 text-sm"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-[var(--color-primary-fg,#fff)]"
          >
            {pending ? fa.saving : fa.nextCta}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onSkipLogo}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5"
          >
            {fa.skipLogo}
          </button>
        </form>
      ) : null}

      {status && step === "ready" ? (
        <section className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
            <p className="text-sm text-[var(--color-muted)]">{fa.storefrontLabel}</p>
            <p dir="ltr" className="mt-1 text-lg font-medium text-[var(--color-fg)]">
              {status.storefrontPath ??
                (status.store ? `/s/${status.store.slug}` : "—")}
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-medium">{fa.checklistTitle}</h2>
            <ul className="flex flex-col gap-2 text-sm">
              <li>{status.checklist.merchantCreated ? "✓" : "○"} {fa.checkMerchant}</li>
              <li>{status.checklist.storeWithGeo ? "✓" : "○"} {fa.checkGeo}</li>
              <li>{status.checklist.brandingReady ? "✓" : "○"} {fa.checkBranding}</li>
              <li>{status.checklist.storefrontReady ? "✓" : "○"} {fa.checkStorefront}</li>
              <li>○ {fa.checkFirstSale}</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            {status.store ? (
              <Link
                href={`/stores/${encodeURIComponent(status.store.id)}/qr`}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5"
              >
                {fa.qrCta}
              </Link>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={onFinish}
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-[var(--color-primary-fg,#fff)]"
            >
              {pending ? fa.finishing : fa.finishCta}
            </button>
            <Link
              href="/products/new"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5"
            >
              {fa.productsCta}
            </Link>
            <Link
              href="/pos"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2.5"
            >
              {fa.posCta}
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
