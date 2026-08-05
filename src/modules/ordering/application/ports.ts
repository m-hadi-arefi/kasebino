/**
 * Application ports for pickup order orchestration (ADR-011).
 * Inventory reserve → ADR-008/049; payment confirm → ADR-012 / ADR-084 sandbox.
 */

export type InventoryReservePort = {
  /**
   * Prefer reserve/decrement on paid (pickup-order-architecture).
   * Must run inside markPaid TX when wired to Drizzle (ARD-034).
   */
  reserveForOrder(input: {
    orderId: string;
    merchantId: string;
    storeId: string;
    lines: ReadonlyArray<{
      productId: string;
      quantity: number;
    }>;
    sameTransaction: true;
  }): Promise<void>;
};

export type InventoryReleasePort = {
  /** Release reservation on cancel/refund after paid. */
  releaseForOrder(input: {
    orderId: string;
    merchantId: string;
    storeId: string;
    lines: ReadonlyArray<{
      productId: string;
      quantity: number;
    }>;
  }): Promise<void>;
};

/**
 * Payment confirmation port — implement via payments
 * `createSandboxPaymentConfirmPort` / `createDefaultSandboxPaymentConfirmPort`
 * (ADR-012). Real PSP → ADR-084 Accepted.
 */
export type PaymentConfirmPort = {
  confirmOrderPayment(input: {
    orderId: string;
    merchantId: string;
    storeId: string;
    amountMinor: bigint;
    paymentReference?: string;
  }): Promise<{ confirmed: boolean; paymentId: string }>;
};

/** No-op stubs for local tests / pre-wiring. */
export function createStubInventoryReservePort(): InventoryReservePort {
  return {
    async reserveForOrder() {
      /* inventory wiring → ARD-034 / ADR-049 */
    },
  };
}

export function createStubInventoryReleasePort(): InventoryReleasePort {
  return {
    async releaseForOrder() {
      /* inventory wiring → ARD-034 / ADR-049 */
    },
  };
}

/**
 * No-op payment confirm for unit tests / pre-wiring (ADR-011).
 * Durable sandbox: `createDefaultSandboxPaymentConfirmPort({ payments })`
 * with a Drizzle (prod) or InMemory (test) PaymentRepository (ADR-093).
 */
export function createStubPaymentConfirmPort(): PaymentConfirmPort {
  return {
    async confirmOrderPayment(input) {
      return {
        confirmed: true,
        paymentId: `pay-stub-${input.orderId}`,
      };
    },
  };
}
