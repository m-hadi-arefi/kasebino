/**
 * PaymentGateway port — sandbox/mock until ADR-084 Accepted (ADR-012).
 * Concrete Iranian PSP adapters must not ship before that ADR is Accepted.
 */



export type CreateGatewayIntentInput = {
  paymentId: string;
  merchantId: string;
  storeId: string;
  orderId: string;
  amountMinor: bigint;
  /** Display currency hint for later PSP redirect pages (always IRR MVP). */
  currency: "IRR";
  /** Optional return URL for browser redirect flows. */
  callbackUrl?: string;
};



export type GatewayIntentResult = {
  providerId: string;
  providerRef: string;
  /** Sandbox may return a fake redirect URL; never a real PSP. */
  redirectUrl: string | null;
};



export type ConfirmGatewayPaymentInput = {
  providerRef: string;
  /** Sandbox allows forcing outcome; real PSPs use webhook body. */
  outcome?: "succeeded" | "failed";
};



export type ConfirmGatewayPaymentResult = {
  confirmed: boolean;
  providerRef: string;
  failureCode?: string;
};



export type RefundGatewayPaymentInput = {
  providerRef: string;
  amountMinor: bigint;
};



export type RefundGatewayPaymentResult = {
  refunded: boolean;
  refundRef: string;
};



/**
 * Outbound PSP port. Domain/application never imports concrete SDKs.
 */
export type PaymentGateway = {
  readonly providerId: string;
  createIntent(input: CreateGatewayIntentInput): Promise<GatewayIntentResult>;
  confirmPayment(
    input: ConfirmGatewayPaymentInput,
  ): Promise<ConfirmGatewayPaymentResult>;
  refundPayment(
    input: RefundGatewayPaymentInput,
  ): Promise<RefundGatewayPaymentResult>;
  /**
   * Verify webhook authenticity. Sandbox uses shared secret HMAC-style token.
   * Real PSPs → ADR-084.
   */
  verifyWebhookSignature(input: {
    provider: string;
    rawBody: string;
    signatureHeader: string | null;
  }): boolean;
};
