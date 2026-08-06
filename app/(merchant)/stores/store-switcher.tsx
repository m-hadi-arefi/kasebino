"use client";

import { useEffect, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/composites/confirm-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);

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

  function applySwitch(nextId: string) {
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

  function onSelect(nextId: string) {
    if (!nextId || nextId === activeId) return;
    if (warnOnSwitch) {
      setPendingStoreId(nextId);
      setConfirmOpen(true);
      return;
    }
    applySwitch(nextId);
  }

  if (stores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{fa.empty}</p>
    );
  }

  const activeStore = stores.find((s) => s.id === activeId);

  return (
    <div className={className ?? "flex flex-col gap-2"}>
      <Label htmlFor="store-switcher">{fa.label}</Label>
      <Select
        value={activeId}
        onValueChange={onSelect}
        disabled={pending}
      >
        <SelectTrigger id="store-switcher" className="w-full">
          <SelectValue
            placeholder={fa.label}
            aria-label={activeStore?.branding.displayName}
          />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {stores.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.branding.displayName} (/s/{s.slug})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <p className="text-xs text-muted-foreground">{fa.switching}</p>
      ) : null}
      {error ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={fa.label}
        description={fa.cartWarn}
        confirmLabel="تغییر فروشگاه"
        onConfirm={() => {
          if (pendingStoreId) applySwitch(pendingStoreId);
          setPendingStoreId(null);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
