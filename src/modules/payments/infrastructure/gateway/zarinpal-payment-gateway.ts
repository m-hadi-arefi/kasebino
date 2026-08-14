/**
 * ZarinPal Payment Gateway adapter implementing PaymentGateway port (ZarinPal REST API v4).
 * Supports both Production and Sandbox modes.
 */

import type {
  ConfirmGatewayPaymentInput,
  ConfirmGatewayPaymentResult,
  CreateGatewayIntentInput,
  GatewayIntentResult,
  PaymentGateway,
  RefundGatewayPaymentInput,
  RefundGatewayPaymentResult,
} from "../../application/ports/payment-gateway.js";

export const ZARINPAL_PROVIDER_ID = "zarinpal";

export type ZarinpalPaymentGatewayOptions = {
  merchantId?: string;
  isSandbox?: boolean;
  /** Optional custom fetch implementation for test mocks / custom HTTP clients. */
  fetchFn?: typeof fetch;
};

export type ZarinpalRequestResponse = {
  data?: {
    code: number;
    message: string;
    authority: string;
    fee_type?: string;
    fee?: number;
  };
  errors?: Array<{ code: number; message: string }> | Record<string, unknown>;
};

export type ZarinpalVerifyResponse = {
  data?: {
    code: number;
    message: string;
    card_hash?: string;
    card_pan?: string;
    ref_id?: number | string;
    fee_type?: string;
    fee?: number;
  };
  errors?: Array<{ code: number; message: string }> | Record<string, unknown>;
};

export type ZarinpalRefundResponse = {
  data?: {
    code: number;
    message: string;
    refund_id?: string;
  };
  errors?: Array<{ code: number; message: string }> | Record<string, unknown>;
};

export class ZarinpalPaymentGateway implements PaymentGateway {
  readonly providerId = ZARINPAL_PROVIDER_ID;
  private readonly merchantId: string;
  private readonly isSandbox: boolean;
  private readonly fetchFn: typeof fetch;

  constructor(opts?: ZarinpalPaymentGatewayOptions) {
    this.merchantId =
      opts?.merchantId?.trim() ||
      process.env.ZARINPAL_MERCHANT_ID?.trim() ||
      "00000000-0000-0000-0000-000000000000";
    this.isSandbox =
      opts?.isSandbox ??
      (process.env.ZARINPAL_SANDBOX === "true" ||
        process.env.ZARINPAL_SANDBOX === "1");
    this.fetchFn = opts?.fetchFn ?? fetch;
  }

  private get apiBaseUrl(): string {
    return this.isSandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment"
      : "https://api.zarinpal.com/pg/v4/payment";
  }

  private get redirectBaseUrl(): string {
    return this.isSandbox
      ? "https://sandbox.zarinpal.com/pg/StartPay"
      : "https://www.zarinpal.com/pg/StartPay";
  }

  /**
   * Convert IRR amountMinor (Rials) to Tomans for ZarinPal API (1 Toman = 10 Rials).
   */
  private amountMinorToTomans(amountMinor: bigint): number {
    const tomans = amountMinor / 10n;
    return Number(tomans > 0n ? tomans : 1n);
  }

  async createIntent(
    input: CreateGatewayIntentInput,
  ): Promise<GatewayIntentResult> {
    const amountInTomans = this.amountMinorToTomans(input.amountMinor);
    const callbackUrl =
      input.callbackUrl ||
      process.env.MOS_PAYMENTS_DEFAULT_CALLBACK_URL ||
      "https://merchantos.local/api/v1/payments/webhooks/zarinpal";

    const payload = {
      merchant_id: this.merchantId,
      amount: amountInTomans,
      description: `Order #${input.orderId} - Payment #${input.paymentId}`,
      callback_url: callbackUrl,
      metadata: {
        paymentId: input.paymentId,
        orderId: input.orderId,
        storeId: input.storeId,
        merchantId: input.merchantId,
      },
    };

    const res = await this.fetchFn(`${this.apiBaseUrl}/request.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `ZarinPal payment request HTTP error: status ${res.status}`,
      );
    }

    const body = (await res.json()) as ZarinpalRequestResponse;

    if (!body.data || body.data.code !== 100 || !body.data.authority) {
      const errDetail = Array.isArray(body.errors)
        ? body.errors.map((e) => `${e.code}: ${e.message}`).join(", ")
        : JSON.stringify(body.errors || body);
      throw new Error(`ZarinPal payment request failed: ${errDetail}`);
    }

    const authority = body.data.authority;
    return {
      providerId: this.providerId,
      providerRef: authority,
      redirectUrl: `${this.redirectBaseUrl}/${authority}`,
    };
  }

  async confirmPayment(
    input: ConfirmGatewayPaymentInput,
  ): Promise<ConfirmGatewayPaymentResult> {
    if (input.outcome === "failed") {
      return {
        confirmed: false,
        providerRef: input.providerRef,
        failureCode: "ZARINPAL_USER_CANCELED",
      };
    }

    const payload = {
      merchant_id: this.merchantId,
      authority: input.providerRef,
    };

    const res = await this.fetchFn(`${this.apiBaseUrl}/verify.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        confirmed: false,
        providerRef: input.providerRef,
        failureCode: `ZARINPAL_HTTP_ERROR_${res.status}`,
      };
    }

    const body = (await res.json()) as ZarinpalVerifyResponse;

    // Code 100: Successfully verified, Code 101: Already verified
    if (
      body.data &&
      (body.data.code === 100 || body.data.code === 101) &&
      body.data.ref_id !== undefined
    ) {
      return {
        confirmed: true,
        providerRef: String(body.data.ref_id),
      };
    }

    const errCode = body.data?.code ?? "DECLINED";
    return {
      confirmed: false,
      providerRef: input.providerRef,
      failureCode: `ZARINPAL_CODE_${errCode}`,
    };
  }

  async refundPayment(
    input: RefundGatewayPaymentInput,
  ): Promise<RefundGatewayPaymentResult> {
    const amountInTomans = this.amountMinorToTomans(input.amountMinor);
    const payload = {
      merchant_id: this.merchantId,
      authority: input.providerRef,
      amount: amountInTomans,
    };

    const res = await this.fetchFn(`${this.apiBaseUrl}/refund.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        refunded: false,
        refundRef: "",
      };
    }

    const body = (await res.json()) as ZarinpalRefundResponse;
    if (body.data && body.data.code === 100) {
      return {
        refunded: true,
        refundRef: body.data.refund_id || `zarinpal-refund-${input.providerRef}`,
      };
    }

    return {
      refunded: false,
      refundRef: "",
    };
  }

  verifyWebhookSignature(input: {
    provider: string;
    rawBody: string;
    signatureHeader: string | null;
  }): boolean {
    if (input.provider !== this.providerId) return false;
    return true;
  }
}
