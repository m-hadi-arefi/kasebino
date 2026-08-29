"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/composites/page-header";
import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { STORE_SWITCHER_UI_COPY_FA } from "@/modules/merchant/ui";
import {
  STORE_HOURS_UI_COPY_FA,
  STORE_LOCATION_UI_COPY_FA,
  STORE_QR_PRINT_UI_COPY_FA,
  listMerchantStores,
  type MerchantStoreDto,
} from "@/modules/store/ui";

import { StoreSwitcher } from "./store-switcher";

export function StoresIndexClient() {
  const [stores, setStores] = useState<MerchantStoreDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="فروشگاه‌ها"
        description="موقعیت، برند و چاپ QR هر فروشگاه"
      />

      <StoreSwitcher />

      <Button asChild className="w-fit">
        <Link href="/stores/new">{STORE_SWITCHER_UI_COPY_FA.createStore}</Link>
      </Button>

      {error ? <ErrorState title={error} /> : null}

      {loading ? <LoadingState rows={2} /> : null}

      <ul className="flex flex-col gap-3">
        {stores.map((store) => (
          <li key={store.id}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {store.branding.displayName}
                </CardTitle>
                <p className="text-sm text-muted-foreground" dir="ltr">
                  /s/{store.slug}
                </p>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/stores/${encodeURIComponent(store.id)}/location`}>
                    {STORE_LOCATION_UI_COPY_FA.locationTitle}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/stores/${encodeURIComponent(store.id)}/hours`}>
                    {STORE_HOURS_UI_COPY_FA.title}
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/stores/${encodeURIComponent(store.id)}/qr`}>
                    {STORE_QR_PRINT_UI_COPY_FA.title}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
