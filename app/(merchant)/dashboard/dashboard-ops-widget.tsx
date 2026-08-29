"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LoadingState } from "@/components/composites/loading-state";
import { SectionHeader } from "@/components/composites/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ANALYTICS_UI_COPY_FA } from "@/modules/analytics/ui";
import {
  fetchInventory,
  fetchMerchantStores,
  fetchProducts,
} from "@/modules/catalog/ui/api";
import { fetchActiveStore } from "@/modules/merchant/ui";
import { fetchStoreOrders } from "@/modules/ordering/ui";

const fa = ANALYTICS_UI_COPY_FA;

const OPEN_ORDER_STATUSES = new Set([
  "pending_payment",
  "paid",
  "preparing",
  "ready_for_pickup",
]);

export function DashboardOpsWidget() {
  const [storeId, setStoreId] = useState("");

  const storesQuery = useQuery({
    queryKey: ["dashboard", "stores"],
    queryFn: fetchMerchantStores,
    staleTime: 60_000,
  });

  const activeStoreQuery = useQuery({
    queryKey: ["dashboard", "active-store"],
    queryFn: fetchActiveStore,
    staleTime: 30_000,
  });

  useEffect(() => {
    const activeId = activeStoreQuery.data?.activeStoreId;
    const first = storesQuery.data?.[0];
    if (activeId && !storeId) setStoreId(activeId);
    else if (first && !storeId) setStoreId(first.id);
  }, [activeStoreQuery.data, storesQuery.data, storeId]);

  const ordersQuery = useQuery({
    queryKey: ["dashboard", "orders", storeId],
    queryFn: () => fetchStoreOrders(storeId),
    enabled: Boolean(storeId),
  });

  const inventoryQuery = useQuery({
    queryKey: ["dashboard", "inventory", storeId],
    queryFn: () => fetchInventory(storeId),
    enabled: Boolean(storeId),
  });

  const productsQuery = useQuery({
    queryKey: ["dashboard", "products"],
    queryFn: () => fetchProducts(),
    staleTime: 60_000,
  });

  const openOrders = useMemo(
    () =>
      (ordersQuery.data ?? []).filter((o) => OPEN_ORDER_STATUSES.has(o.status))
        .length,
    [ordersQuery.data],
  );

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productsQuery.data ?? []) map.set(p.id, p.name);
    return map;
  }, [productsQuery.data]);

  const lowStock = useMemo(() => {
    return (inventoryQuery.data ?? []).filter(
      (item) =>
        item.reorderLevel > 0 && item.quantity <= item.reorderLevel,
    );
  }, [inventoryQuery.data]);

  const loading =
    storesQuery.isLoading ||
    (Boolean(storeId) &&
      (ordersQuery.isLoading || inventoryQuery.isLoading));

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title={fa.opsTitle}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/orders">{fa.opsOpenOrders}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory">{fa.opsOpenInventory}</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <LoadingState rows={1} label={fa.opsLoading} />
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">{fa.opsOrders}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {openOrders.toLocaleString("fa-IR")}
                </p>
                {openOrders === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {fa.opsEmptyOrders}
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <LoadingState rows={1} label={fa.opsLoading} />
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">{fa.opsLowStock}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {lowStock.length.toLocaleString("fa-IR")}
                </p>
                {lowStock.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {fa.opsEmptyStock}
                  </p>
                ) : (
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {lowStock.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        {productNameById.get(item.productId) ?? item.productId}
                        {" · "}
                        {item.quantity.toLocaleString("fa-IR")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
