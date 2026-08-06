"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/composites/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  STORE_QR_PRINT_UI_COPY_FA,
  fetchStoreQrMeta,
  type StoreQrMetaDto,
} from "@/modules/store/ui";

const fa = STORE_QR_PRINT_UI_COPY_FA;

type Props = {
  storeId: string;
};

export function StoreQrPrintClient({ storeId }: Props) {
  const [meta, setMeta] = useState<StoreQrMetaDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchStoreQrMeta(storeId);
        if (!cancelled) setMeta(data);
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

  const dataUrl = meta
    ? `data:${meta.contentType};base64,${meta.pngBase64}`
    : null;

  return (
    <div className="flex flex-col gap-6 print:max-w-none">
      <PageHeader
        className="print:items-center print:text-center"
        title={fa.title}
        description={fa.subtitle}
        breadcrumbs={[
          { label: "فروشگاه‌ها", href: "/stores" },
          { label: fa.title },
        ]}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link href={`/stores/${encodeURIComponent(storeId)}/location`}>
                {fa.backLocation}
              </Link>
            </Button>
          </div>
        }
      />

      {error ? (
        <Alert variant="destructive" className="print:hidden">
          <AlertDescription aria-live="polite">{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card
        className="print:border-0 print:shadow-none"
        aria-label={fa.title}
      >
        <CardContent className="flex flex-col items-center gap-4 py-8 print:bg-transparent">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="کد QR فروشگاه"
            width={280}
            height={280}
            className="h-auto w-[min(70vw,280px)] print:w-[70mm]"
          />
        ) : (
          <p className="text-sm text-muted-foreground">{fa.loading}</p>
        )}
        <p className="text-center text-lg font-medium text-foreground">
          {fa.stickerCta}
        </p>
        {meta ? (
          <p className="break-all text-center text-xs text-muted-foreground print:text-sm">
            <span className="block font-medium text-foreground">
              {fa.targetLabel}
            </span>
            {meta.targetUrl}
          </p>
        ) : null}
        </CardContent>
      </Card>

      <ul className="flex flex-col gap-2 text-sm text-muted-foreground print:gap-3 print:text-base">
        <li>{fa.stickerWindow}</li>
        <li>{fa.stickerCounter}</li>
        <li className="print:hidden">{fa.downloadHint}</li>
      </ul>

      <Button
        type="button"
        className="print:hidden"
        onClick={() => window.print()}
        disabled={!meta}
      >
        {fa.printCta}
      </Button>
    </div>
  );
}
