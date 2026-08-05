"use client";

import { useState } from "react";

import {
  STOREFRONT_UI_COPY_FA,
  addToStorefrontCart,
  type PublicProductDto,
} from "@/modules/storefront/ui";

const fa = STOREFRONT_UI_COPY_FA;

export function AddToCartButton({
  storeSlug,
  product,
}: {
  storeSlug: string;
  product: PublicProductDto;
}) {
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  if (!product.inStock) {
    return (
      <p className="text-[var(--color-danger)]" role="status">
        {fa.outOfStock}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-fg)]">
        {fa.quantityLabel}
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.max(1, product.availableQuantity)}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base"
        />
      </label>
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 font-medium text-[var(--color-primary-fg)]"
        onClick={() => {
          addToStorefrontCart(storeSlug, {
            productId: product.id,
            name: product.name,
            unitPriceMinor: product.priceAmountMinor,
            priceDisplayToman: product.priceDisplayToman,
            quantity: qty,
          });
          setMessage(fa.addedToCart);
        }}
      >
        {fa.addToCart}
      </button>
      {message ? (
        <p className="text-sm text-[var(--color-success)]" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
