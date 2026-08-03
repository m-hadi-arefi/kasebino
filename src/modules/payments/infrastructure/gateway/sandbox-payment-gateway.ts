/**
 * Sandbox PaymentGateway — no real Iranian PSP (ADR-084 remains Proposed).
 */



import { createHmac, randomUUID } from "node:crypto";



import { SANDBOX_PROVIDER_ID } from "../../../../payments-domain/index.js";
import type {
  ConfirmGatewayPaymentInput,
  ConfirmGatewayPaymentResult,
  CreateGatewayIntentInput,
  GatewayIntentResult,
  PaymentGateway,
  RefundGatewayPaymentInput,
  RefundGatewayPaymentResult,
} from "../../application/ports/payment-gateway.js";
import { timingSafeEqualHex } from "../../application/webhook-crypto.js";



export type SandboxPaymentGatewayOptions = {
  webhookSecret?: string;
  /** When true, confirmPayment returns failed unless outcome overridden. */
  declineByDefault?: boolean;
};



export class SandboxPaymentGateway implements PaymentGateway {
  readonly providerId = SANDBOX_PROVIDER_ID;
  readonly created: GatewayIntentResult[] = [];
  readonly confirmed: ConfirmGatewayPaymentResult[] = [];
  readonly refunded: RefundGatewayPaymentResult[] = [];
  private readonly webhookSecret: string;
  private readonly declineByDefault: boolean;



  constructor(opts?: SandboxPaymentGatewayOptions) {
    this.webhookSecret = opts?.webhookSecret ?? "merchantos-sandbox-webhook";
    this.declineByDefault = opts?.declineByDefault ?? false;
  }



  async createIntent(
    input: CreateGatewayIntentInput,
  ): Promise<GatewayIntentResult> {
    const providerRef = `sandbox-${input.paymentId}-${randomUUID().slice(0, 8)}`;
    const result: GatewayIntentResult = {
      providerId: this.providerId,
      providerRef,
      redirectUrl: `https://sandbox.merchantos.local/pay/${providerRef}`,
    };
    this.created.push(result);
    return result;
  }



  async confirmPayment(
    input: ConfirmGatewayPaymentInput,
  ): Promise<ConfirmGatewayPaymentResult> {
    const outcome =
      input.outcome ?? (this.declineByDefault ? "failed" : "succeeded");
    const result: ConfirmGatewayPaymentResult =
      outcome === "succeeded"
        ? { confirmed: true, providerRef: input.providerRef }
        : {
            confirmed: false,
            providerRef: input.providerRef,
            failureCode: "SANDBOX_DECLINED",
          };
    this.confirmed.push(result);
    return result;
  }



  async refundPayment(
    input: RefundGatewayPaymentInput,
  ): Promise<RefundGatewayPaymentResult> {
    const result: RefundGatewayPaymentResult = {
      refunded: true,
      refundRef: `sandbox-refund-${input.providerRef}`,
    };
    this.refunded.push(result);
    return result;
  }



  verifyWebhookSignature(input: {
    provider: string;
    rawBody: string;
    signatureHeader: string | null;
  }): boolean {
    if (input.provider !== this.providerId) return false;
    if (!input.signatureHeader) return false;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(input.rawBody)
      .digest("hex");
    return timingSafeEqualHex(expected, input.signatureHeader);
  }
}



/** Alias for tests that prefer Mock naming (mirrors customer-identity SMS). */
export { SandboxPaymentGateway as MockPaymentGateway };
