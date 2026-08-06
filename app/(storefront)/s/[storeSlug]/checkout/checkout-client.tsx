"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/composites/empty-state";
import { ErrorState } from "@/components/composites/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STOREFRONT_CONSENT_LABEL_FA,
  STOREFRONT_UI_COPY_FA,
  cartTotalMinor,
  clearStorefrontCart,
  confirmSandboxPayment,
  createStorefrontPickupOrder,
  formatStorefrontToman,
  formatUnpaidDeadlineJalali,
  readStorefrontCart,
  setCartLineQuantity,
  type StorefrontCartLine,
  type StorefrontOrderDto,
  type StorefrontPaymentDto,
} from "@/modules/storefront/ui";

const fa = STOREFRONT_UI_COPY_FA;

function sandboxSimulateEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
}

export function CheckoutClient({
  storeSlug,
  storeId,
  isAuthenticated,
}: {
  storeSlug: string;
  storeId: string;
  isAuthenticated: boolean;
}) {
  const base = `/s/${encodeURIComponent(storeSlug)}`;
  const [lines, setLines] = useState<StorefrontCartLine[]>([]);
  const [consent, setConsent] = useState(false);
  const [placed, setPlaced] = useState<{
    order: StorefrontOrderDto;
    payment: StorefrontPaymentDto | null;
    redirectUrl: string | null;
  } | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    setLines(readStorefrontCart(storeSlug));
  }, [storeSlug]);

  const placeMutation = useMutation({
    mutationFn: () =>
      createStorefrontPickupOrder({
        storeSlug,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        consentCheckboxAccepted: consent,
        callbackUrl:
          typeof window !== "undefined"
            ? `${window.location.origin}${base}/checkout`
            : undefined,
      }),
    onSuccess: (result) => {
      clearStorefrontCart(storeSlug);
      setLines([]);
      setPlaced({
        order: result.order,
        payment: result.payment,
        redirectUrl: result.redirectUrl,
      });
    },
  });

  const sandboxMutation = useMutation({
    mutationFn: () => {
      if (!placed?.payment?.id) {
        throw new Error(fa.paymentFailedRetry);
      }
      return confirmSandboxPayment({ paymentId: placed.payment.id });
    },
    onSuccess: (result) => {
      if (result.confirmed) {
        setPaid(true);
        setPlaced((prev) =>
          prev
            ? {
                ...prev,
                order: {
                  ...prev.order,
                  status: result.orderStatus ?? "paid",
                },
                payment: result.payment,
              }
            : prev,
        );
      }
    },
  });

  const total = cartTotalMinor(lines);

  if (placed) {
    const amountLabel =
      placed.payment?.amountDisplayToman ?? placed.order.totalDisplayToman;

    return (
      <section className="flex flex-col gap-4" aria-live="polite">
        <h2 className="text-xl font-semibold text-foreground">
          {paid ? fa.orderPaidSuccess : fa.orderSuccess}
        </h2>
        {!paid ? (
          <>
            <p className="text-muted-foreground">{fa.orderPendingPayment}</p>
            <p className="text-base font-medium">
              {fa.paymentAmountLabel}: {amountLabel}
            </p>
            <p className="text-sm text-muted-foreground">
              {fa.unpaidNote} · مهلت تقریبی تا {formatUnpaidDeadlineJalali()}
            </p>
            <p className="text-sm text-muted-foreground">{fa.fulfillmentLabel}</p>
            <p className="text-sm text-muted-foreground">{fa.sandboxOnlyHint}</p>
            {placed.redirectUrl ? (
              <Button asChild className="min-h-11 w-full">
                <a href={placed.redirectUrl}>{fa.goPay}</a>
              </Button>
            ) : null}
            {sandboxSimulateEnabled() && placed.payment?.id ? (
              <Button
                type="button"
                variant="outline"
                disabled={sandboxMutation.isPending}
                className="min-h-11 w-full"
                onClick={() => sandboxMutation.mutate()}
              >
                {sandboxMutation.isPending
                  ? fa.sandboxSimulating
                  : fa.sandboxSimulatePay}
              </Button>
            ) : null}
            {sandboxMutation.isError ? (
              <ErrorState
                description={
                  (sandboxMutation.error as Error).message ||
                  fa.paymentFailedRetry
                }
              />
            ) : null}
          </>
        ) : (
          <>
            <p className="text-base font-medium">
              {fa.paymentAmountLabel}: {amountLabel}
            </p>
            <p className="text-sm text-muted-foreground">{fa.fulfillmentLabel}</p>
          </>
        )}
        <Button asChild variant="link" className="h-auto p-0">
          <Link href={`${base}/dashboard/orders`}>سفارش‌های من</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="sr-only">
        storeId {storeId} · فقط تحویل حضوری · تومان · جلالی
      </p>

      <Card aria-label={fa.fulfillmentLabel}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{fa.fulfillmentLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>{fa.pickupRestrictionNote}</p>
          <p>{fa.pickupEtaNote}</p>
        </CardContent>
      </Card>

      <section aria-label={fa.cartTitle} className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{fa.cartTitle}</h2>
        {lines.length === 0 ? (
          <EmptyState title={fa.cartEmpty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((line) => (
              <li key={line.productId}>
                <Card>
                  <CardContent className="flex min-h-11 flex-wrap items-center justify-between gap-2 pt-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{line.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {line.priceDisplayToman} × {line.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        aria-label={fa.quantityLabel}
                        className="min-h-11 w-16 text-center"
                        value={line.quantity}
                        onChange={(e) => {
                          const next = setCartLineQuantity(
                            storeSlug,
                            line.productId,
                            Math.max(0, Number(e.target.value) || 0),
                          );
                          setLines(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 text-destructive"
                        onClick={() => {
                          const next = setCartLineQuantity(
                            storeSlug,
                            line.productId,
                            0,
                          );
                          setLines(next);
                        }}
                      >
                        {fa.removeLine}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {lines.length > 0 ? (
          <p className="text-base font-semibold">
            {fa.totalLabel}: {formatStorefrontToman(total)}
          </p>
        ) : null}
      </section>

      {!isAuthenticated ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground">{fa.loginRequired}</p>
          <Button asChild className="min-h-11 w-full">
            <Link
              href={`${base}/login?callbackUrl=${encodeURIComponent(`${base}/checkout`)}`}
            >
              {fa.loginCta}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card/95 p-4 shadow-md backdrop-blur">
          <div className="flex items-start gap-3 text-sm">
            <Checkbox
              id="checkout-consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <Label htmlFor="checkout-consent" className="leading-6">
              {STOREFRONT_CONSENT_LABEL_FA}
            </Label>
          </div>
          {placeMutation.isError ? (
            <ErrorState
              description={
                (placeMutation.error as Error).message || fa.networkError
              }
            />
          ) : null}
          <Button
            type="button"
            disabled={lines.length === 0 || !consent || placeMutation.isPending}
            className="min-h-11 w-full"
            onClick={() => placeMutation.mutate()}
          >
            {placeMutation.isPending ? fa.placingOrder : fa.placeOrder}
          </Button>
          <p className="text-sm text-muted-foreground">
            {fa.unpaidNote} · {fa.jalaliHint}
          </p>
        </div>
      )}
    </div>
  );
}
