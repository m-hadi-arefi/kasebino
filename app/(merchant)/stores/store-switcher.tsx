"use client";

import { useEffect, useState, useTransition } from "react";

import {
  STORE_SWITCHER_UI_COPY_FA,
  fetchActiveStore,
  setActiveStore,
} from "@/modules/merchant/ui";
import type { MerchantStoreDto } from "@/modules/store/ui";

type Props = {
  value?: string;
  onChange?: (store: MerchantStoreDto) => void;
  /** When true, confirm before switch (POS cart risk). */
  warnOnSwitch?: boolean;
  className?: string;
};

const fa = STORE_SWITCHER_UI_COPY_FA;

export function StoreSwitcher({
  value,
  onChange,
  warnOnSwitch = false,
  className,
}: Props) {
  const [stores, setStores] = useState<MerchantStoreDto[]>([]);
  const [activeId, setActiveId] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchActiveStore();
        if (cancelled) return;
        setStores(data.stores);
        const id = value || data.activeStoreId || data.stores[0]?.id || "";
        setActiveId(id);
        if (id && onChange) {
          const store = data.stores.find((s) => s.id === id);
          if (store) onChange(store);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : fa.switchError);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (value) setActiveId(value);
  }, [value]);

  function onSelect(nextId: string) {
    if (!nextId || nextId === activeId) return;
    if (warnOnSwitch && typeof window !== "undefined") {
      const ok = window.confirm(fa.cartWarn);
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const data = await setActiveStore(nextId);
        setStores(data.stores);
        setActiveId(data.activeStoreId ?? nextId);
        const store =
          data.store ?? data.stores.find((s) => s.id === nextId) ?? null;
        if (store && onChange) onChange(store);
      } catch (e) {
        setError(e instanceof Error ? e.message : fa.switchError);
      }
    });
  }

  if (stores.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">{fa.empty}</p>
    );
  }

  return (
    <div className={className ?? "flex flex-col gap-1"}>
      <label className="text-sm text-[var(--color-muted)]" htmlFor="store-switcher">
        {fa.label}
      </label>
      <select
        id="store-switcher"
        className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
        value={activeId}
        disabled={pending}
        onChange={(e) => onSelect(e.target.value)}
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.branding.displayName} (/s/{s.slug})
          </option>
        ))}
      </select>
      {pending ? (
        <p className="text-xs text-[var(--color-muted)]">{fa.switching}</p>
      ) : null}
      {error ? (
        <p aria-live="polite" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
