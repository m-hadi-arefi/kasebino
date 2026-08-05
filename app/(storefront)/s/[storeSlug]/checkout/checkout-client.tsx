"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

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
        <h2 className="text-xl font-semibold text-[var(--color-fg)]">
          {paid ? fa.orderPaidSuccess : fa.orderSuccess}
        </h2>
        {!paid ? (
          <>
            <p className="text-[var(--color-muted)]">{fa.orderPendingPayment}</p>
            <p className="text-base font-medium">
              {fa.paymentAmountLabel}: {amountLabel}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {fa.unpaidNote} · مهلت تقریبی تا {formatUnpaidDeadlineJalali()}
            </p>
            <p className="text-sm text-[var(--color-muted)]">{fa.fulfillmentLabel}</p>
            <p className="text-sm text-[var(--color-muted)]">{fa.sandboxOnlyHint}</p>
            {placed.redirectUrl ? (
              <a
                href={placed.redirectUrl}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-center font-medium text-[var(--color-primary-fg)]"
              >
                {fa.goPay}
              </a>
            ) : null}
            {sandboxSimulateEnabled() && placed.payment?.id ? (
              <button
                type="button"
                disabled={sandboxMutation.isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 py-3 font-medium disabled:opacity-50"
                onClick={() => sandboxMutation.mutate()}
              >
                {sandboxMutation.isPending
                  ? fa.sandboxSimulating
                  : fa.sandboxSimulatePay}
              </button>
            ) : null}
            {sandboxMutation.isError ? (
              <p className="text-[var(--color-danger)]" role="alert">
                {(sandboxMutation.error as Error).message ||
                  fa.paymentFailedRetry}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-base font-medium">
              {fa.paymentAmountLabel}: {amountLabel}
            </p>
            <p className="text-sm text-[var(--color-muted)]">{fa.fulfillmentLabel}</p>
          </>
        )}
        <Link
          href={`${base}/dashboard/orders`}
          className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          سفارش‌های من
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="sr-only">
        storeId {storeId} · فقط تحویل حضوری · تومان · جلالی
      </p>

      <section
        aria-label={fa.fulfillmentLabel}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
      >
        <p className="font-medium text-[var(--color-fg)]">{fa.fulfillmentLabel}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{fa.pickupRestrictionNote}</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{fa.pickupEtaNote}</p>
      </section>

      <section aria-label={fa.cartTitle} className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{fa.cartTitle}</h2>
        {lines.length === 0 ? (
          <p className="text-[var(--color-muted)]">{fa.cartEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((line) => (
              <li
                key={line.productId}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{line.name}</span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {line.priceDisplayToman} × {line.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-label={fa.quantityLabel}
                    className="min-h-11 w-16 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 text-center"
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
                  <button
                    type="button"
                    className="min-h-11 px-2 text-sm text-[var(--color-danger)]"
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
                  </button>
                </div>
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
          <p className="text-[var(--color-muted)]">{fa.loginRequired}</p>
          <Link
            href={`${base}/login?callbackUrl=${encodeURIComponent(`${base}/checkout`)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 font-medium text-[var(--color-primary-fg)]"
          >
            {fa.loginCta}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex min-h-11 items-start gap-3 text-sm text-[var(--color-fg)]">
            <input
              type="checkbox"
              className="mt-1 size-5"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{STOREFRONT_CONSENT_LABEL_FA}</span>
          </label>
          {placeMutation.isError ? (
            <p className="text-[var(--color-danger)]" role="alert">
              {(placeMutation.error as Error).message || fa.networkError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={lines.length === 0 || placeMutation.isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 font-medium text-[var(--color-primary-fg)] disabled:opacity-50"
            onClick={() => placeMutation.mutate()}
          >
            {placeMutation.isPending ? fa.placingOrder : fa.placeOrder}
          </button>
          <p className="text-sm text-[var(--color-muted)]">
            {fa.unpaidNote} · {fa.jalaliHint}
          </p>
        </div>
      )}
    </div>
  );
}
