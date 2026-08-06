"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <p className="text-destructive" role="status">
        {fa.outOfStock}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-qty">{fa.quantityLabel}</Label>
        <Input
          id="product-qty"
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.max(1, product.availableQuantity)}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="min-h-11 text-base"
        />
      </div>
      <Button
        type="button"
        className="min-h-11 w-full"
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
      </Button>
      {message ? (
        <p className="text-sm text-primary" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
