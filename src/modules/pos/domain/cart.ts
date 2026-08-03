/**
 * Cart value object — pre-sale checkout basket (ADR-009).
 * Validated before CompleteSale persists a Sale.
 */

export type CartLineInput = {
  productId: string;
  /** Persian product title snapshot. */
  productName: string;
  quantity: number;
  /** Unit price IRR minor units (rial). */
  unitPriceMinor: bigint | number;
};

export type Cart = {
  readonly merchantId: string;
  readonly storeId: string;
  readonly lines: readonly CartLineInput[];
};

export type NormalizedCartLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: bigint;
};

export type NormalizedCart = {
  merchantId: string;
  storeId: string;
  lines: NormalizedCartLine[];
};
