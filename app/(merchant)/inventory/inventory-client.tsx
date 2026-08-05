"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  adjustInventory,
  fetchInventory,
  fetchMerchantStores,
  fetchProducts,
  type CatalogStockItemDto,
} from "@/modules/catalog/ui/api";
import { CATALOG_UI_COPY_FA } from "@/modules/catalog/ui/copy";
import { formatInventoryJalali } from "@/modules/catalog/ui/format";
import { fetchActiveStore } from "@/modules/merchant/ui";

import { StoreSwitcher } from "../stores/store-switcher";

const fa = CATALOG_UI_COPY_FA;

export function InventoryClient() {
  const queryClient = useQueryClient();
  const [storeId, setStoreId] = useState("");
  const [deltas, setDeltas] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const storesQuery = useQuery({
    queryKey: ["catalog", "stores"],
    queryFn: fetchMerchantStores,
    staleTime: 60_000,
  });

  const activeStoreQuery = useQuery({
    queryKey: ["catalog", "active-store"],
    queryFn: fetchActiveStore,
    staleTime: 30_000,
  });

  useEffect(() => {
    const activeId = activeStoreQuery.data?.activeStoreId;
    const first = storesQuery.data?.[0];
    if (activeId && !storeId) setStoreId(activeId);
    else if (first && !storeId) setStoreId(first.id);
  }, [activeStoreQuery.data, storesQuery.data, storeId]);

  const productsQuery = useQuery({
    queryKey: ["catalog", "products", ""],
    queryFn: () => fetchProducts(),
  });

  const inventoryQuery = useQuery({
    queryKey: ["catalog", "inventory", storeId],
    queryFn: () => fetchInventory(storeId),
    enabled: Boolean(storeId),
  });

  const stockByProduct = useMemo(() => {
    const map = new Map<string, CatalogStockItemDto>();
    for (const item of inventoryQuery.data ?? []) {
      map.set(item.productId, item);
    }
    return map;
  }, [inventoryQuery.data]);

  const adjustMutation = useMutation({
    mutationFn: async (productId: string) => {
      const raw = deltas[productId] ?? "";
      const delta = Number(raw);
      if (!Number.isInteger(delta) || delta === 0) {
        throw new Error("مقدار تغییر موجودی باید عدد صحیح غیرصفر باشد.");
      }
      return adjustInventory({
        storeId,
        productId,
        delta,
        createIfMissing: true,
        ...(reasons[productId]?.trim()
          ? { reason: reasons[productId]!.trim() }
          : {}),
      });
    },
    onSuccess: async (_item, productId) => {
      setError(null);
      setSuccess(fa.adjustSuccess);
      setDeltas((prev) => ({ ...prev, [productId]: "" }));
      await queryClient.invalidateQueries({
        queryKey: ["catalog", "inventory", storeId],
      });
    },
    onError: (err: Error) => {
      setSuccess(null);
      setError(err.message || fa.networkError);
    },
  });

  if (storesQuery.isLoading) {
    return <p className="text-[var(--color-muted)]">{fa.loadingInventory}</p>;
  }

  if (!storesQuery.data?.length) {
    return <p className="text-[var(--color-muted)]">{fa.noStore}</p>;
  }

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
          href="/products"
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
        >
          {fa.openProducts}
        </Link>
      </nav>

      <StoreSwitcher
        value={storeId || undefined}
        onChange={(store) => {
          setStoreId(store.id);
          void queryClient.invalidateQueries({
            queryKey: ["catalog", "inventory"],
          });
        }}
      />

      {inventoryQuery.isLoading || productsQuery.isLoading ? (
        <p className="text-[var(--color-muted)]">{fa.loadingInventory}</p>
      ) : null}

      {!productsQuery.isLoading &&
      (productsQuery.data?.length ?? 0) === 0 ? (
        <p className="text-[var(--color-muted)]">{fa.emptyProducts}</p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {(productsQuery.data ?? []).map((product) => {
          const stock = stockByProduct.get(product.id);
          const qty = stock?.quantity ?? 0;
          return (
            <li
              key={product.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <p className="font-medium">{product.name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {fa.quantityLabel}: {qty.toLocaleString("fa-IR")}
                {stock
                  ? ` · ${fa.updatedAt}: ${formatInventoryJalali(stock.updatedAt)}`
                  : ""}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <input
                  inputMode="numeric"
                  placeholder={fa.adjustDeltaLabel}
                  value={deltas[product.id] ?? ""}
                  onChange={(e) =>
                    setDeltas((prev) => ({
                      ...prev,
                      [product.id]: e.target.value,
                    }))
                  }
                  className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                />
                <input
                  placeholder={fa.adjustReasonLabel}
                  value={reasons[product.id] ?? ""}
                  onChange={(e) =>
                    setReasons((prev) => ({
                      ...prev,
                      [product.id]: e.target.value,
                    }))
                  }
                  className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                />
                <button
                  type="button"
                  disabled={adjustMutation.isPending}
                  onClick={() => {
                    setError(null);
                    adjustMutation.mutate(product.id);
                  }}
                  className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 font-medium text-[var(--color-primary-fg)]"
                >
                  {fa.adjustSubmit}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {!inventoryQuery.isLoading &&
      productsQuery.data?.length &&
      !(inventoryQuery.data?.length ?? 0) ? (
        <p className="text-sm text-[var(--color-muted)]">{fa.emptyInventory}</p>
      ) : null}

      <div aria-live="polite" className="text-sm">
        {error ? <p className="text-[var(--color-danger)]">{error}</p> : null}
        {success ? (
          <p className="text-[var(--color-success)]">{success}</p>
        ) : null}
      </div>
    </div>
  );
}
