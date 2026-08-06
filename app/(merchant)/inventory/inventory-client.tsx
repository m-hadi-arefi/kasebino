"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/composites/empty-state";
import { LoadingState } from "@/components/composites/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    return <LoadingState rows={2} label={fa.loadingInventory} />;
  }

  if (!storesQuery.data?.length) {
    return <EmptyState title={fa.noStore} />;
  }

  return (
    <div className="flex flex-col gap-5">
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
        <LoadingState rows={3} label={fa.loadingInventory} />
      ) : null}

      {!productsQuery.isLoading &&
      (productsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title={fa.emptyProducts} actionHref="/products/new" actionLabel={fa.addProduct} />
      ) : null}

      <ul className="flex flex-col gap-4">
        {(productsQuery.data ?? []).map((product) => {
          const stock = stockByProduct.get(product.id);
          const qty = stock?.quantity ?? 0;
          return (
            <li key={product.id}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {fa.quantityLabel}: {qty.toLocaleString("fa-IR")}
                    {stock
                      ? ` · ${fa.updatedAt}: ${formatInventoryJalali(stock.updatedAt)}`
                      : ""}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="space-y-2">
                    <Label>{fa.adjustDeltaLabel}</Label>
                    <Input
                      inputMode="numeric"
                      placeholder={fa.adjustDeltaLabel}
                      value={deltas[product.id] ?? ""}
                      onChange={(e) =>
                        setDeltas((prev) => ({
                          ...prev,
                          [product.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{fa.adjustReasonLabel}</Label>
                    <Input
                      placeholder={fa.adjustReasonLabel}
                      value={reasons[product.id] ?? ""}
                      onChange={(e) =>
                        setReasons((prev) => ({
                          ...prev,
                          [product.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={adjustMutation.isPending}
                    onClick={() => {
                      setError(null);
                      adjustMutation.mutate(product.id);
                    }}
                  >
                    {fa.adjustSubmit}
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {!inventoryQuery.isLoading &&
      productsQuery.data?.length &&
      !(inventoryQuery.data?.length ?? 0) ? (
        <p className="text-sm text-muted-foreground">{fa.emptyInventory}</p>
      ) : null}

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
