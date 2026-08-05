/**
 * ADR-012 Payments module tests.
 */

import { describe, expect, it } from "vitest";

import {
  createPaymentsUseCases,
  isSandboxPaymentConfirmAllowed,
  InMemoryPaymentRepository,
  SandboxPaymentGateway,
  signSandboxWebhook,
  paymentStatusLabelFa,
  PAYMENTS_ERROR_MESSAGES_FA,
  PAYMENTS_DECISION,
  PaymentsDomainError,
  createDefaultSandboxPaymentConfirmPort,
  createSandboxPaymentConfirmPort,
  computePilotFeeMinor,
  FEE_POLICY,
} from "./index.js";
import {
  createOrderingUseCases,
  InMemoryOrderRepository,
} from "../ordering/index.js";

function createPaymentsHarness(opts?: {
  declineByDefault?: boolean;
  now?: () => Date;
}) {
  const payments = new InMemoryPaymentRepository();
  const gateway = new SandboxPaymentGateway({
    ...(opts?.declineByDefault !== undefined
      ? { declineByDefault: opts.declineByDefault }
      : {}),
  });
  let seq = 0;
  const useCases = createPaymentsUseCases({
    payments,
    gateway,
    ...(opts?.now ? { now: opts.now } : {}),
    idFactory: () => `pay-${++seq}`,
  });
  return { payments, gateway, useCases };
}

describe("ADR-012 Payments module", () => {
  it("creates sandbox PaymentIntent with processing status and zero fee", async () => {
    const { useCases, gateway } = createPaymentsHarness();

    const result = await useCases.createIntent({
      merchantId: "m1",
      storeId: "s1",
      orderId: "ord-1",
      amountMinor: 250_000n,
      idempotencyKey: "idem-1",
    });

    expect(result.created).toBe(true);
    expect(result.payment.status).toBe("processing");
    expect(result.payment.providerId).toBe("sandbox");
    expect(result.payment.feeChargedMinor).toBe(0n);
    expect(result.payment.currency).toBe("IRR");
    expect(result.redirectUrl).toMatch(/sandbox/);
    expect(result.event?.eventName).toBe("PaymentIntentCreated");
    expect(gateway.created).toHaveLength(1);
    expect(FEE_POLICY.active).toBe(false);
    expect(computePilotFeeMinor(250_000n)).toBe(0n);
  });

  it("is idempotent for the same idempotencyKey", async () => {
    const { useCases } = createPaymentsHarness();
    const input = {
      merchantId: "m1",
      storeId: "s1",
      orderId: "ord-1",
      amountMinor: 100_000n,
      idempotencyKey: "same-key",
    };
    const first = await useCases.createIntent(input);
    const second = await useCases.createIntent(input);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.payment.id).toBe(first.payment.id);
  });

  it("confirms sandbox payment successfully", async () => {
    const { useCases } = createPaymentsHarness();
    const created = await useCases.createIntent({
      merchantId: "m1",
      storeId: "s1",
      orderId: "ord-2",
      amountMinor: 50_000n,
      idempotencyKey: "idem-2",
    });

    const confirmed = await useCases.confirmSandboxPayment({
      paymentId: created.payment.id,
    });

    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.payment.status).toBe("succeeded");
    expect(confirmed.payment.feeChargedMinor).toBe(0n);
    expect(confirmed.event.eventName).toBe("PaymentSucceeded");
  });

  it("records sandbox decline as failed with Persian error path", async () => {
    const { useCases } = createPaymentsHarness();
    const created = await useCases.createIntent({
      merchantId: "m1",
      storeId: "s1",
      orderId: "ord-3",
      amountMinor: 50_000n,
      idempotencyKey: "idem-3",
    });

    const declined = await useCases.confirmSandboxPayment({
      paymentId: created.payment.id,
      outcome: "failed",
    });

    expect(declined.confirmed).toBe(false);
    expect(declined.payment.status).toBe("failed");
    expect(declined.event.eventName).toBe("PaymentFailed");
    expect(PAYMENTS_ERROR_MESSAGES_FA.PAYMENT_NOT_CONFIRMED).toMatch(/پرداخت/);
  });

  it("rejects invalid webhook signatures with Persian error", async () => {
    const { useCases } = createPaymentsHarness();
    const created = await useCases.createIntent({
      merchantId: "m1",
      storeId: "s1",
      orderId: "ord-4",
      amountMinor: 50_000n,
      idempotencyKey: "idem-4",
    });

    await expect(
      useCases.handleWebhook({
        provider: "sandbox",
        rawBody: JSON.stringify({ paymentId: created.payment.id }),
        signatureHeader: "deadbeef",
        paymentId: created.payment.id,
        providerRef: created.payment.providerRef!,
        outcome: "succeeded",
      }),
    ).rejects.toMatchObject({
      code: "WEBHOOK_SIGNATURE_INVALID",
      messageFa: PAYMENTS_ERROR_MESSAGES_FA.WEBHOOK_SIGNATURE_INVALID,
    });

    const body = JSON.stringify({ paymentId: created.payment.id });
    const ok = await useCases.handleWebhook({
      provider: "sandbox",
      rawBody: body,
      signatureHeader: signSandboxWebhook(body),
      paymentId: created.payment.id,
      providerRef: created.payment.providerRef!,
      outcome: "succeeded",
    });
    expect(ok.confirmed).toBe(true);
    expect(ok.payment.status).toBe("succeeded");
  });

  it("refunds a succeeded sandbox payment", async () => {
    const { useCases } = createPaymentsHarness();
    const created = await useCases.createIntent({
      merchantId: "m1",
      storeId: "s1",
      orderId: "ord-5",
      amountMinor: 80_000n,
      idempotencyKey: "idem-5",
    });
    await useCases.confirmSandboxPayment({ paymentId: created.payment.id });
    const refunded = await useCases.refundPayment({
      paymentId: created.payment.id,
    });
    expect(refunded.payment.status).toBe("refunded");
    expect(refunded.event.eventName).toBe("PaymentRefunded");
  });

  it("wires Ordering markPaid through sandbox PaymentConfirmPort", async () => {
    const paymentRepo = new InMemoryPaymentRepository();
    const gateway = new SandboxPaymentGateway();
    const paymentConfirm = createSandboxPaymentConfirmPort({
      payments: paymentRepo,
      gateway,
      idFactory: () => "pay-wired-1",
    });

    const orders = new InMemoryOrderRepository();
    let seq = 0;
    const ordering = createOrderingUseCases({
      orders,
      paymentConfirm,
      idFactory: () => `ord-${++seq}`,
    });

    const created = await ordering.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: [
        {
          id: "line-1",
          productId: "p1",
          productName: "نان بربری",
          quantity: 1,
          unitPriceMinor: 40_000n,
        },
      ],
      idempotencyKey: "order-idem-1",
    });

    const paid = await ordering.markPaid({
      orderId: created.order.id,
      paymentReference: "ref-wired",
    });

    expect(paid.order.status).toBe("paid");
    expect(paid.paymentId).toBe("pay-wired-1");
    expect(paid.event.eventName).toBe("OrderPaid");
    expect(paid.event.payload.paymentId).toBe("pay-wired-1");

    const payment = await paymentRepo.findById("pay-wired-1");
    expect(payment?.status).toBe("succeeded");
    expect(payment?.feeChargedMinor).toBe(0n);
    expect(gateway.created.length).toBeGreaterThanOrEqual(1);
    expect(gateway.confirmed.length).toBeGreaterThanOrEqual(1);
  });

  it("defaults Ordering paymentConfirm to stub (InMemory not auto-wired)", async () => {
    const orders = new InMemoryOrderRepository();
    let seq = 0;
    const ordering = createOrderingUseCases({
      orders,
      idFactory: () => `ord-${++seq}`,
    });

    const created = await ordering.createOrder({
      merchantId: "m1",
      storeId: "s1",
      lines: [
        {
          id: "line-1",
          productId: "p1",
          productName: "شیر",
          quantity: 1,
          unitPriceMinor: 30_000n,
        },
      ],
      idempotencyKey: "default-sandbox",
    });

    const paid = await ordering.markPaid({ orderId: created.order.id });
    expect(paid.order.status).toBe("paid");
    expect(paid.paymentId).toMatch(/^pay-stub-/);
    expect(
      createDefaultSandboxPaymentConfirmPort({
        payments: new InMemoryPaymentRepository(),
      }),
    ).toBeDefined();
  });

  it("exposes Persian labels and forbids Stripe-as-default in decision", () => {
    expect(paymentStatusLabelFa("succeeded")).toBe("پرداخت موفق");
    expect(PAYMENTS_DECISION.forbiddenDefaultProviders).toContain("stripe");
    expect(PAYMENTS_DECISION.implementationAllowed).toBe(
      "ports_and_mocks_only",
    );
    expect(() => new PaymentsDomainError("PROVIDER_NOT_AVAILABLE").messageFa).not.toThrow();
    expect(new PaymentsDomainError("FEES_INACTIVE").messageFa).toMatch(/کرمان|کارمزد/);
  });

  it("gates sandbox confirm to local/dev with explicit flag", () => {
    expect(
      isSandboxPaymentConfirmAllowed({
        MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM: "1",
        MOS_ENV: "local",
        NODE_ENV: "test",
      }),
    ).toBe(true);
    expect(
      isSandboxPaymentConfirmAllowed({
        MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM: "1",
        MOS_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isSandboxPaymentConfirmAllowed({
        MOS_ALLOW_SANDBOX_PAYMENT_CONFIRM: "0",
        MOS_ENV: "local",
        NODE_ENV: "development",
      }),
    ).toBe(false);
  });
});
