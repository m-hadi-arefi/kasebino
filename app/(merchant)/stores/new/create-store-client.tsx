"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import {
  STORE_CREATE_UI_COPY_FA,
  createMerchantStore,
  setActiveStore,
} from "@/modules/merchant/ui";

const fa = STORE_CREATE_UI_COPY_FA;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function CreateStoreClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("کرمان");
  const [province, setProvince] = useState("کرمان");
  const [latitude, setLatitude] = useState("30.2839");
  const [longitude, setLongitude] = useState("57.0834");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!SLUG_RE.test(slug.trim().toLowerCase())) {
      setError("شناسه آدرس معتبر نیست.");
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
        const store = await createMerchantStore({
          slug: slug.trim().toLowerCase(),
          displayName,
          address: {
            line1,
            city,
            province,
            latitude: lat,
            longitude: lng,
          },
        });
        await setActiveStore(store.id);
        router.replace(`/stores/${encodeURIComponent(store.id)}/location`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطا در ایجاد فروشگاه.");
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/stores"
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {fa.back}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          {fa.title}
        </h1>
        <p className="text-[var(--color-muted)]">{fa.subtitle}</p>
      </header>

      <p aria-live="polite" className="min-h-6 text-sm text-[var(--color-danger)]">
        {error}
      </p>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-sm">
          <span>نام فروشگاه</span>
          <input
            required
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span>شناسه آدرس ویترین</span>
          <input
            dir="ltr"
            required
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
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
          {pending ? fa.submitting : fa.submit}
        </button>
      </form>
    </main>
  );
}
