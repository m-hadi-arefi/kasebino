import { describe, expect, it } from "vitest";
import { ZarinpalPaymentGateway } from "./zarinpal-payment-gateway.js";
import { createPaymentGatewayFromEnv } from "./payment-gateway-factory.js";
import { SandboxPaymentGateway } from "./sandbox-payment-gateway.js";

describe("ZarinpalPaymentGateway", () => {
  it("creates payment intent with ZarinPal API v4 request.json", async () => {
    let requestedUrl = "";
    let requestedBody: any = null;

    const mockFetch: typeof fetch = async (url, init) => {
      requestedUrl = String(url);
      requestedBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            code: 100,
            message: "Success",
            authority: "A00000000000000000000000000000001234",
            fee_type: "Merchant",
            fee: 100,
          },
        }),
      } as Response;
    };

    const gateway = new ZarinpalPaymentGateway({
      merchantId: "test-merchant-id-1234",
      isSandbox: true,
      fetchFn: mockFetch,
    });

    const result = await gateway.createIntent({
      paymentId: "pay-100",
      merchantId: "mch-1",
      storeId: "str-1",
      orderId: "ord-1",
      amountMinor: 50000n, // 50,000 Rials = 5,000 Tomans
      currency: "IRR",
      callbackUrl: "https://example.com/callback",
    });

    expect(result.providerId).toBe("zarinpal");
    expect(result.providerRef).toBe("A00000000000000000000000000000001234");
    expect(result.redirectUrl).toBe(
      "https://sandbox.zarinpal.com/pg/StartPay/A00000000000000000000000000000001234",
    );

    expect(requestedUrl).toBe("https://sandbox.zarinpal.com/pg/v4/payment/request.json");
    expect(requestedBody.merchant_id).toBe("test-merchant-id-1234");
    expect(requestedBody.amount).toBe(5000); // Converted from 50,000 Rials to 5,000 Tomans
  });

  it("confirms payment successfully with verify.json code 100", async () => {
    let requestedUrl = "";
    let requestedBody: any = null;

    const mockFetch: typeof fetch = async (url, init) => {
      requestedUrl = String(url);
      requestedBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            code: 100,
            message: "Verified",
            ref_id: 987654321,
            card_pan: "603799******1234",
          },
        }),
      } as Response;
    };

    const gateway = new ZarinpalPaymentGateway({
      merchantId: "test-merchant-id-1234",
      isSandbox: true,
      fetchFn: mockFetch,
    });

    const result = await gateway.confirmPayment({
      providerRef: "A00000000000000000000000000000001234",
      outcome: "succeeded",
    });

    expect(result.confirmed).toBe(true);
    expect(result.providerRef).toBe("987654321");
    expect(requestedUrl).toBe("https://sandbox.zarinpal.com/pg/v4/payment/verify.json");
    expect(requestedBody.authority).toBe("A00000000000000000000000000000001234");
  });

  it("refunds payment successfully with refund.json code 100", async () => {
    const mockFetch: typeof fetch = async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            code: 100,
            message: "Success",
            refund_id: "ref-sub-555",
          },
        }),
      } as Response;
    };

    const gateway = new ZarinpalPaymentGateway({
      merchantId: "test-merchant-id-1234",
      isSandbox: true,
      fetchFn: mockFetch,
    });

    const result = await gateway.refundPayment({
      providerRef: "A00000000000000000000000000000001234",
      amountMinor: 50000n,
    });

    expect(result.refunded).toBe(true);
    expect(result.refundRef).toBe("ref-sub-555");
  });
});

describe("createPaymentGatewayFromEnv (Strategy Pattern)", () => {
  it("instantiates ZarinpalPaymentGateway when MOS_PAYMENT_PROVIDER=zarinpal", () => {
    const gateway = createPaymentGatewayFromEnv({
      env: { MOS_PAYMENT_PROVIDER: "zarinpal", ZARINPAL_MERCHANT_ID: "mch-99" },
    });
    expect(gateway.providerId).toBe("zarinpal");
    expect(gateway).toBeInstanceOf(ZarinpalPaymentGateway);
  });

  it("instantiates SandboxPaymentGateway when MOS_PAYMENT_PROVIDER=sandbox", () => {
    const gateway = createPaymentGatewayFromEnv({
      env: { MOS_PAYMENT_PROVIDER: "sandbox" },
    });
    expect(gateway.providerId).toBe("sandbox");
    expect(gateway).toBeInstanceOf(SandboxPaymentGateway);
  });
});
