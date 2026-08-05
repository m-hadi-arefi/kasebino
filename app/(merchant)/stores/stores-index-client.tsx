"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { STORE_SWITCHER_UI_COPY_FA } from "@/modules/merchant/ui";
import {
  STORE_LOCATION_UI_COPY_FA,
  STORE_QR_PRINT_UI_COPY_FA,
  listMerchantStores,
  type MerchantStoreDto,
} from "@/modules/store/ui";

import { StoreSwitcher } from "./store-switcher";

export function StoresIndexClient() {
  const [stores, setStores] = useState<MerchantStoreDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listMerchantStores();
        if (!cancelled) setStores(list);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : STORE_LOCATION_UI_COPY_FA.loadError,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {STORE_LOCATION_UI_COPY_FA.backDashboard}
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-fg)]">
          فروشگاه‌ها
        </h1>
        <p className="text-[var(--color-muted)]">
          موقعیت، برند و چاپ QR هر فروشگاه
        </p>
      </header>

      <StoreSwitcher />

      <Link
        href="/stores/new"
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-[var(--color-primary-fg,#fff)]"
      >
        {STORE_SWITCHER_UI_COPY_FA.createStore}
      </Link>

      <p aria-live="polite" className="text-sm text-[var(--color-danger)]">
        {error}
      </p>

      <ul className="flex flex-col gap-3">
        {stores.map((store) => (
          <li
            key={store.id}
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
          >
            <div>
              <p className="font-medium text-[var(--color-fg)]">
                {store.branding.displayName}
              </p>
              <p className="text-sm text-[var(--color-muted)]" dir="ltr">
                /s/{store.slug}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/stores/${encodeURIComponent(store.id)}/location`}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm"
              >
                {STORE_LOCATION_UI_COPY_FA.locationTitle}
              </Link>
              <Link
                href={`/stores/${encodeURIComponent(store.id)}/qr`}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-fg)]"
              >
                {STORE_QR_PRINT_UI_COPY_FA.title}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
