"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState, useTransition } from "react";

import { iranianMobileSchema } from "@/shared/validation/forms/phone";
import { fetchActiveStore } from "@/modules/merchant/ui";
import {
  completePosSale,
  fetchMerchantStores,
  fetchSaleReceiptDownload,
  lookupProductByBarcode,
  searchProducts,
  type PosProductDto,
  type PosSaleDto,
} from "@/modules/pos/ui/api";
import {
  POS_CONSENT_NOTICE_VERSION,
  POS_UI_COPY_FA,
} from "@/modules/pos/ui/copy";
import {
  cartTotalMinor,
  formatPosJalaliDateTime,
  formatPosToman,
} from "@/modules/pos/ui/format";
import { usePosCart } from "@/modules/pos/ui/use-pos-cart";
import {
  fetchWalletByPhone,
  redeemPoints,
} from "@/modules/loyalty/ui";
import { useRealtimeStoreChannel } from "@/infrastructure/emqx/realtime-client/use-realtime-store-channel";
import { POS_OFFLINE_COPY_FA } from "@/modules/pos/offline/client";
import { enqueueOfflineSaleInIdb } from "@/modules/pos/offline/browser-queue";

import { trackPosFunnelStep } from "@/modules/pos/ui/track-pos-funnel";

import { ErrorState } from "@/components/composites/error-state";
import { LoadingState } from "@/components/composites/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { StoreSwitcher } from "../stores/store-switcher";
import { CameraBarcodeSheet } from "./camera-barcode-sheet";

type Step = "cart" | "checkout" | "success";

function productToMinor(product: PosProductDto): number {
  return Number(BigInt(product.priceAmountMinor));
}

export function PosRegister() {
  const searchId = useId();
  const barcodeId = useId();
  const phoneId = useId();

  const merchantId = usePosCart((s) => s.merchantId);
  const storeId = usePosCart((s) => s.storeId);
  const lines = usePosCart((s) => s.lines);
  const phoneDraft = usePosCart((s) => s.customerPhoneDraft);
  const setScope = usePosCart((s) => s.setScope);
  const setCustomerPhoneDraft = usePosCart((s) => s.setCustomerPhoneDraft);
  const addLine = usePosCart((s) => s.addLine);
  const updateQuantity = usePosCart((s) => s.updateQuantity);
  const removeLine = usePosCart((s) => s.removeLine);
  const clearCart = usePosCart((s) => s.clearCart);

  const [step, setStep] = useState<Step>("cart");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [unmatchedBarcode, setUnmatchedBarcode] = useState<string | null>(null);
  const [tender, setTender] = useState<"cash" | "card_terminal" | "mixed">(
    "cash",
  );
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PosSaleDto | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [redeemMembershipId, setRedeemMembershipId] = useState<string | null>(
    null,
  );
  const [redeemBalance, setRedeemBalance] = useState<number | null>(null);
  const [redeemPointsDraft, setRedeemPointsDraft] = useState("");
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 120);
    return () => window.clearTimeout(t);
  }, [query]);

  const storesQuery = useQuery({
    queryKey: ["pos", "stores"],
    queryFn: fetchMerchantStores,
    staleTime: 60_000,
  });

  const activeStoreQuery = useQuery({
    queryKey: ["pos", "active-store"],
    queryFn: fetchActiveStore,
    staleTime: 30_000,
  });

  useRealtimeStoreChannel({
    merchantId,
    storeId,
    channels: ["sales", "inventory", "orders"],
  });

  // Active cookie / first store bootstrap for POS scope.
  useEffect(() => {
    const active = activeStoreQuery.data?.store;
    const first = active ?? storesQuery.data?.[0];
    if (!first) return;
    if (!storeId || !merchantId) {
      setScope(first.merchantId, first.id);
    }
  }, [activeStoreQuery.data, storesQuery.data, storeId, merchantId, setScope]);

  useEffect(() => {
    if (!merchantId) return;
    trackPosFunnelStep({
      step: "pos_opened",
      merchantId,
      storeId,
    });
  }, [merchantId, storeId]);

  const searchQuery = useQuery({
    queryKey: ["pos", "search", debouncedQuery],
    queryFn: () => searchProducts(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
    staleTime: 5_000,
  });

  const totalMinor = useMemo(() => cartTotalMinor(lines), [lines]);

  const addProduct = (product: PosProductDto) => {
    addLine({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPriceMinor: productToMinor(product),
    });
    setUnmatchedBarcode(null);
    setError(null);
    setQuery("");
    setManualBarcode("");
  };

  const resolveBarcode = async (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;
    setError(null);
    try {
      const product = await lookupProductByBarcode(code);
      if (!product) {
        setUnmatchedBarcode(code);
        return;
      }
      addProduct(product);
    } catch (e) {
      setError(e instanceof Error ? e.message : POS_UI_COPY_FA.networkError);
    }
  };

  const saleMutation = useMutation({
    mutationFn: completePosSale,
    onSuccess: (data) => {
      setReceipt(data.sale);
      clearCart();
      setStep("success");
      setIdempotencyKey(crypto.randomUUID());
      setRedeemMembershipId(null);
      setRedeemBalance(null);
      setRedeemPointsDraft("");
      setRedeemMessage(null);
    },
  });

  const walletLookupMutation = useMutation({
    mutationFn: () => {
      if (!storeId) throw new Error(POS_UI_COPY_FA.noStore);
      const parsed = iranianMobileSchema.safeParse(phoneDraft ?? "");
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues[0]?.message ?? POS_UI_COPY_FA.networkError,
        );
      }
      return fetchWalletByPhone({ storeId, phone: parsed.data });
    },
    onSuccess: (data) => {
      setRedeemMembershipId(data.membershipId);
      setRedeemBalance(data.wallet?.balance ?? 0);
      setRedeemMessage(null);
      setError(null);
    },
    onError: (e: Error) => {
      setRedeemMembershipId(null);
      setRedeemBalance(null);
      setError(e.message || POS_UI_COPY_FA.networkError);
    },
  });

  const redeemMutation = useMutation({
    mutationFn: () => {
      if (!storeId || !redeemMembershipId) {
        throw new Error(POS_UI_COPY_FA.networkError);
      }
      const points = Number.parseInt(redeemPointsDraft, 10);
      if (!Number.isInteger(points) || points < 1) {
        throw new Error("تعداد امتیاز معتبر نیست.");
      }
      return redeemPoints({
        storeId,
        membershipId: redeemMembershipId,
        points,
        referenceId: `pos-redeem:${idempotencyKey}`,
      });
    },
    onSuccess: (data) => {
      setRedeemBalance(data.wallet.balance);
      setRedeemPointsDraft("");
      setRedeemMessage(POS_UI_COPY_FA.redeemSuccess);
      setError(null);
    },
    onError: (e: Error) => {
      setError(e.message || POS_UI_COPY_FA.networkError);
    },
  });

  const queueOfflineSale = async (phone: string) => {
    if (!storeId || !merchantId) {
      setError(POS_UI_COPY_FA.noStore);
      return;
    }
    const total = cartTotalMinor(lines);
    await enqueueOfflineSaleInIdb({
      merchantId,
      storeId,
      phoneNational: phone,
      tenderType: tender,
      syncKey: idempotencyKey,
      totalAmountMinor: BigInt(total),
      consentNoticeVersion: POS_CONSENT_NOTICE_VERSION,
      lines: lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceMinor: BigInt(line.unitPriceMinor),
      })),
    });
    clearCart();
    setReceipt({
      id: `offline:${idempotencyKey}`,
      receiptRef: `OFFLINE-${idempotencyKey.slice(0, 8)}`,
      phoneNational: phone,
      tenderType: tender,
      totalAmountMinor: String(total),
      totalDisplayToman: formatPosToman(BigInt(total)),
      completedAt: null,
      createdAt: new Date().toISOString(),
    });
    setStep("success");
    setIdempotencyKey(crypto.randomUUID());
    setError(null);
    setRedeemMessage(POS_OFFLINE_COPY_FA.saleQueuedSuccess);
  };

  const onComplete = () => {
    if (!storeId || !merchantId) {
      setError(POS_UI_COPY_FA.noStore);
      return;
    }
    const parsed = iranianMobileSchema.safeParse(phoneDraft ?? "");
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? POS_UI_COPY_FA.networkError);
      return;
    }
    if (lines.length === 0) {
      setError(POS_UI_COPY_FA.cartEmpty);
      return;
    }
    setError(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      void queueOfflineSale(parsed.data).catch((e: unknown) => {
        setError(e instanceof Error ? e.message : POS_UI_COPY_FA.networkError);
      });
      return;
    }

    saleMutation.mutate(
      {
        storeId,
        phone: parsed.data,
        tenderType: tender,
        idempotencyKey,
        lines: lines.map((line) => ({
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
        })),
      },
      {
        onError: (e: Error) => {
          const offlineNow =
            typeof navigator !== "undefined" && !navigator.onLine;
          const looksNetwork =
            /failed to fetch|network|load failed|offline/i.test(e.message);
          if (offlineNow || looksNetwork) {
            void queueOfflineSale(parsed.data).catch((err: unknown) => {
              setError(
                err instanceof Error ? err.message : POS_UI_COPY_FA.networkError,
              );
            });
            return;
          }
          setError(e.message || POS_UI_COPY_FA.networkError);
        },
      },
    );
  };

  if (storesQuery.isLoading) {
    return <LoadingState rows={1} label={POS_UI_COPY_FA.loadingScope} />;
  }

  if (storesQuery.isError || !storesQuery.data?.length) {
    return <ErrorState title={POS_UI_COPY_FA.noStore} />;
  }

  if (step === "success" && receipt) {
    return (
      <section
        className="flex flex-col gap-4"
        aria-live="polite"
        aria-label={POS_UI_COPY_FA.successTitle}
      >
        <h2 className="text-xl font-semibold text-[var(--color-success)]">
          {POS_UI_COPY_FA.successTitle}
        </h2>
        {redeemMessage ? (
          <p className="text-sm text-[var(--color-muted)]" role="status">
            {redeemMessage}
          </p>
        ) : null}
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-muted)]">
              {POS_UI_COPY_FA.receiptRef}
            </dt>
            <dd className="font-mono text-[var(--color-fg)]" dir="ltr">
              {receipt.receiptRef}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-muted)]">{POS_UI_COPY_FA.total}</dt>
            <dd>
              {receipt.totalDisplayToman ??
                formatPosToman(BigInt(receipt.totalAmountMinor))}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--color-muted)]">زمان</dt>
            <dd>
              {formatPosJalaliDateTime(
                receipt.completedAt ?? receipt.createdAt,
              )}
            </dd>
          </div>
        </dl>
        {receipt.receiptReady || receipt.receiptUrl ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void (async () => {
                try {
                  const { downloadUrl } = await fetchSaleReceiptDownload(
                    receipt.id,
                  );
                  window.open(downloadUrl, "_blank", "noopener,noreferrer");
                } catch {
                  // soft fail — sale already succeeded
                }
              })();
            }}
          >
            {POS_UI_COPY_FA.viewReceipt}
          </Button>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            {POS_UI_COPY_FA.receiptPreparing}
          </p>
        )}
        <Button
          type="button"
          onClick={() => {
            setReceipt(null);
            setStep("cart");
            setCustomerPhoneDraft(null);
          }}
        >
          {POS_UI_COPY_FA.newSale}
        </Button>
      </section>
    );
  }

  if (step === "checkout") {
    return (
      <section className="flex flex-col gap-5" aria-label={POS_UI_COPY_FA.phoneStepTitle}>
        <Button
          type="button"
          variant="link"
          className="h-auto self-start p-0"
          onClick={() => setStep("cart")}
        >
          {POS_UI_COPY_FA.back}
        </Button>
        <h2 className="text-xl font-semibold">{POS_UI_COPY_FA.phoneStepTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {POS_UI_COPY_FA.consentNotice}
        </p>
        <div className="space-y-2">
          <Label htmlFor={phoneId}>{POS_UI_COPY_FA.phoneLabel}</Label>
          <Input
            id={phoneId}
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder={POS_UI_COPY_FA.phonePlaceholder}
            value={phoneDraft ?? ""}
            onChange={(e) => setCustomerPhoneDraft(e.target.value)}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{POS_UI_COPY_FA.tenderTitle}</legend>
          <RadioGroup
            value={tender}
            onValueChange={(v) =>
              setTender(v as "cash" | "card_terminal" | "mixed")
            }
            className="flex flex-col gap-2"
          >
          {(
            [
              ["cash", POS_UI_COPY_FA.tenderCash],
              ["card_terminal", POS_UI_COPY_FA.tenderCard],
              ["mixed", POS_UI_COPY_FA.tenderMixed],
            ] as const
          ).map(([value, label]) => (
            <Label
              key={value}
              htmlFor={`tender-${value}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3"
            >
              <RadioGroupItem value={value} id={`tender-${value}`} />
              <span>{label}</span>
            </Label>
          ))}
          </RadioGroup>
        </fieldset>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4">
          <p className="text-sm font-medium">{POS_UI_COPY_FA.redeemPoints}</p>
          <p className="text-sm text-muted-foreground">
            {POS_UI_COPY_FA.redeemHint}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={walletLookupMutation.isPending}
            onClick={() => walletLookupMutation.mutate()}
          >
            {POS_UI_COPY_FA.redeemLookup}
          </Button>
          {redeemBalance !== null ? (
            <p className="text-sm" aria-live="polite">
              {POS_UI_COPY_FA.redeemBalance}:{" "}
              <strong>
                {redeemBalance} {POS_UI_COPY_FA.redeemPointsLabel}
              </strong>
            </p>
          ) : null}
          <div className="space-y-2">
            <Label>{POS_UI_COPY_FA.redeemPointsLabel}</Label>
            <Input
              inputMode="numeric"
              value={redeemPointsDraft}
              onChange={(e) => setRedeemPointsDraft(e.target.value)}
              disabled={!redeemMembershipId}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={
              !redeemMembershipId ||
              redeemMutation.isPending ||
              !redeemPointsDraft.trim()
            }
            onClick={() => redeemMutation.mutate()}
          >
            {redeemMutation.isPending
              ? POS_UI_COPY_FA.redeeming
              : POS_UI_COPY_FA.redeemApply}
          </Button>
          {redeemMessage ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {redeemMessage}
            </p>
          ) : null}
          </CardContent>
        </Card>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>{POS_UI_COPY_FA.total}</span>
          <span>{formatPosToman(totalMinor)}</span>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription role="alert">{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="button"
          disabled={saleMutation.isPending}
          onClick={onComplete}
        >
          {saleMutation.isPending
            ? POS_UI_COPY_FA.completing
            : POS_UI_COPY_FA.completeSale}
        </Button>
        <p className="text-xs text-muted-foreground">
          {POS_UI_COPY_FA.pickupOnlyNote}
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5 pb-28">
        <StoreSwitcher
          value={storeId || undefined}
          warnOnSwitch
          onChange={(store) => {
            if (store.id === storeId) return;
            clearCart();
            setScope(store.merchantId, store.id);
          }}
        />
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor={searchId}>{POS_UI_COPY_FA.searchLabel}</Label>
            <Input
              id={searchId}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                startTransition(() => {
                  /* keep typing responsive */
                });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void resolveBarcode(query);
                }
              }}
              placeholder={POS_UI_COPY_FA.searchPlaceholder}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={() => setCameraOpen(true)}
            >
              {POS_UI_COPY_FA.scanCamera}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor={barcodeId}>{POS_UI_COPY_FA.barcodeManualLabel}</Label>
            <div className="flex gap-2">
              <Input
                id={barcodeId}
                dir="ltr"
                inputMode="numeric"
                className="flex-1"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void resolveBarcode(manualBarcode);
                  }
                }}
                placeholder={POS_UI_COPY_FA.barcodePlaceholder}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void resolveBarcode(manualBarcode)}
              >
                {POS_UI_COPY_FA.addToCart}
              </Button>
            </div>
          </div>
        </div>

        {searchQuery.isFetching ? (
          <p className="text-sm text-[var(--color-muted)]">
            {POS_UI_COPY_FA.searching}
          </p>
        ) : null}
        {searchQuery.data && searchQuery.data.length > 0 ? (
          <ul className="flex flex-col gap-2" aria-label={POS_UI_COPY_FA.searchLabel}>
            {searchQuery.data.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 text-start transition-colors hover:bg-accent"
                  onClick={() => addProduct(product)}
                >
                  <span>{product.name}</span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {product.priceDisplayToman}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {unmatchedBarcode ? (
          <Card className="border-amber-500/50">
            <CardContent className="flex flex-col gap-2 pt-4" role="status">
            <h3 className="font-medium text-amber-600">
              {POS_UI_COPY_FA.unmatchedTitle}
            </h3>
            <p className="text-sm text-muted-foreground">
              {POS_UI_COPY_FA.unmatchedBody}{" "}
              <span dir="ltr">{unmatchedBarcode}</span>
            </p>
            <Button
              type="button"
              variant="link"
              className="h-auto justify-start p-0"
              onClick={() => {
                setQuery(unmatchedBarcode);
                setUnmatchedBarcode(null);
              }}
            >
              {POS_UI_COPY_FA.unmatchedSearch}
            </Button>
            <p className="text-xs text-muted-foreground">
              {POS_UI_COPY_FA.unmatchedCreateHint}{" "}
              <a
                href={POS_UI_COPY_FA.unmatchedCreateHref}
                className="text-primary underline"
              >
                {POS_UI_COPY_FA.unmatchedCreateLink}
              </a>
            </p>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription role="alert">{error}</AlertDescription>
          </Alert>
        ) : null}

        <section aria-label={POS_UI_COPY_FA.cartRegion} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{POS_UI_COPY_FA.cartRegion}</h2>
          {lines.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              {POS_UI_COPY_FA.cartEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lines.map((line) => (
                <li
                  key={line.productId}
                >
                  <Card>
                    <CardContent className="flex flex-col gap-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{line.productName}</span>
                    <Badge variant="secondary">
                      {formatPosToman(line.unitPriceMinor * line.quantity)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="flex items-center gap-2 text-sm">
                      {POS_UI_COPY_FA.quantity}
                      <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        className="h-11 w-20 text-center"
                        value={line.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            line.productId,
                            Number.parseInt(e.target.value, 10) || 0,
                          )
                        }
                      />
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeLine(line.productId)}
                    >
                      {POS_UI_COPY_FA.removeLine}
                    </Button>
                  </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <div className="flex flex-1 flex-col">
            <span className="text-xs text-muted-foreground">
              {POS_UI_COPY_FA.total}
            </span>
            <span className="text-lg font-semibold">
              {formatPosToman(totalMinor)}
            </span>
          </div>
          <Button
            type="button"
            disabled={lines.length === 0}
            className="min-h-11 min-w-28"
            onClick={() => {
              setError(null);
              setStep("checkout");
            }}
          >
            {POS_UI_COPY_FA.checkout}
          </Button>
        </div>
      </div>

      <CameraBarcodeSheet
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDetected={(code) => {
          void resolveBarcode(code);
        }}
      />
    </>
  );
}
