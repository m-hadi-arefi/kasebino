import { describe, expect, it } from "vitest";

import {
  createLoyaltyEarnPort,
  createLoyaltyUseCases,
  runLoyaltyPointsExpiryJob,
  InMemoryPointRuleRepository,
  InMemoryPointsLedgerRepository,
  InMemoryWalletRepository,
  LOYALTY_ERROR_MESSAGES_FA,
  LoyaltyDomainError,
  addCalendarMonths,
} from "./index.js";
import {
  createPosUseCases,
  InMemorySaleRepository,
  type InventoryDecrementPort,
  type MembershipUpsertPort,
} from "../pos/index.js";
import { InMemoryOutboxStore } from "../../outbox/index.js";

function createLoyaltyHarness(opts?: { now?: () => Date }) {
  const wallets = new InMemoryWalletRepository();
  const rules = new InMemoryPointRuleRepository();
  const ledger = new InMemoryPointsLedgerRepository();
  let seq = 0;
  const useCases = createLoyaltyUseCases({
    wallets,
    rules,
    ledger,
    ...(opts?.now ? { now: opts.now } : {}),
    idFactory: () => `id-${++seq}`,
  });
  return { wallets, rules, ledger, useCases };
}

describe("ADR-010 Loyalty module", () => {
  it("earns points on sale per default rule (100_000 IRR → 1 point)", async () => {
    const { useCases, ledger } = createLoyaltyHarness();

    const result = await useCases.earnPointsForSale({
      saleId: "sale-1",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-1",
      customerId: "cust-1",
      totalAmountMinor: 250_000n,
    });

    expect(result.created).toBe(true);
    expect(result.points).toBe(2);
    expect(result.wallet.balance).toBe(2);
    expect(result.wallet.storeMembershipId).toBe("mem-1");
    expect(result.event?.eventName).toBe("PointsEarned");
    expect(result.event?.payload.points).toBe(2);

    const entries = await ledger.listByWalletId(result.wallet.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.entryType).toBe("earn");
    expect(entries[0]?.referenceId).toBe("sale-1");
  });

  it("is idempotent for the same saleId earn", async () => {
    const { useCases, ledger } = createLoyaltyHarness();
    const input = {
      saleId: "sale-dup",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-1",
      customerId: "cust-1",
      totalAmountMinor: 100_000n,
    };

    const first = await useCases.earnPointsForSale(input);
    const second = await useCases.earnPointsForSale(input);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.points).toBe(1);
    expect(second.wallet.balance).toBe(1);
    expect(second.event).toBeNull();
    const entries = await ledger.listByWalletId(first.wallet.id);
    expect(entries).toHaveLength(1);
  });

  it("redeems points and rejects overdraw with Persian error", async () => {
    const { useCases } = createLoyaltyHarness();
    await useCases.earnPointsForSale({
      saleId: "sale-r",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-1",
      customerId: "cust-1",
      totalAmountMinor: 300_000n,
    });

    const redeemed = await useCases.redeemPoints({
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-1",
      points: 2,
      referenceId: "pos-1",
    });
    expect(redeemed.wallet.balance).toBe(1);
    expect(redeemed.created).toBe(true);
    expect(redeemed.event?.eventName).toBe("PointsRedeemed");

    const replay = await useCases.redeemPoints({
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-1",
      points: 2,
      referenceId: "pos-1",
    });
    expect(replay.created).toBe(false);
    expect(replay.wallet.balance).toBe(1);
    expect(replay.event).toBeNull();

    try {
      await useCases.redeemPoints({
        merchantId: "m1",
        storeId: "s1",
        membershipId: "mem-1",
        points: 5,
      });
      expect.fail("expected insufficient balance");
    } catch (error) {
      expect(error).toBeInstanceOf(LoyaltyDomainError);
      expect((error as LoyaltyDomainError).code).toBe("INSUFFICIENT_BALANCE");
      expect((error as LoyaltyDomainError).messageFa).toBe(
        LOYALTY_ERROR_MESSAGES_FA.INSUFFICIENT_BALANCE,
      );
    }

    const wallet = await useCases.getWallet({ membershipId: "mem-1" });
    expect(wallet?.balance).toBe(1);
  });

  it("expires balance 12 months after last earn and appends PointsExpired", async () => {
    let now = new Date("2024-01-15T10:00:00.000Z");
    const { useCases, ledger } = createLoyaltyHarness({
      now: () => now,
    });

    await useCases.earnPointsForSale({
      saleId: "sale-exp",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-1",
      customerId: "cust-1",
      totalAmountMinor: 500_000n,
    });

    now = addCalendarMonths(now, 12);
    const { expired } = await useCases.expireStaleWallets({
      merchantId: "m1",
      storeId: "s1",
    });

    expect(expired).toHaveLength(1);
    expect(expired[0]?.points).toBe(5);
    expect(expired[0]?.wallet.balance).toBe(0);
    expect(expired[0]?.event.eventName).toBe("PointsExpired");

    const entries = await ledger.listByWalletId(expired[0]!.wallet.id);
    expect(entries.map((e) => e.entryType)).toEqual(["earn", "expire"]);
  });

  it("respects disabled expiry and custom months", async () => {
    let now = new Date("2024-06-01T00:00:00.000Z");
    const { useCases } = createLoyaltyHarness({ now: () => now });

    await useCases.configurePointRule({
      merchantId: "m1",
      storeId: "s1",
      expiryMonthsAfterLastEarn: null,
    });
    await useCases.earnPointsForSale({
      saleId: "sale-off",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-1",
      customerId: "cust-1",
      totalAmountMinor: 100_000n,
    });
    now = addCalendarMonths(now, 24);
    const disabled = await useCases.expireStaleWallets({ storeId: "s1" });
    expect(disabled.expired).toHaveLength(0);

    await useCases.configurePointRule({
      merchantId: "m1",
      storeId: "s2",
      expiryMonthsAfterLastEarn: 6,
    });
    now = new Date("2025-01-01T00:00:00.000Z");
    await useCases.earnPointsForSale({
      saleId: "sale-6m",
      merchantId: "m1",
      storeId: "s2",
      membershipId: "mem-2",
      customerId: "cust-2",
      totalAmountMinor: 100_000n,
    });
    now = addCalendarMonths(now, 6);
    const custom = await useCases.expireStaleWallets({ storeId: "s2" });
    expect(custom.expired).toHaveLength(1);
    expect(custom.expired[0]?.wallet.storeMembershipId).toBe("mem-2");
  });

  it("ledger repository is append-only (duplicate id rejected)", async () => {
    const { useCases, ledger } = createLoyaltyHarness();
    const earned = await useCases.earnPointsForSale({
      saleId: "sale-a",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-1",
      customerId: "cust-1",
      totalAmountMinor: 100_000n,
    });
    const [entry] = await ledger.listByWalletId(earned.wallet.id);
    await expect(ledger.append(entry!)).rejects.toThrow(/append-only/);
  });

  it("createLoyaltyEarnPort satisfies POS CompleteSale wiring", async () => {
    const loyalty = createLoyaltyHarness();
    const loyaltyEarn = createLoyaltyEarnPort(loyalty.useCases);

    const membership: MembershipUpsertPort = {
      async upsertFromPosPhoneCapture() {
        return {
          membershipId: "mem-pos",
          customerId: "cust-pos",
          phoneNational: "09121112233",
          created: true,
        };
      },
    };
    const inventory: InventoryDecrementPort = {
      async decrementForSale() {
        return;
      },
    };
    const sales = new InMemorySaleRepository();
    let n = 0;
    const pos = createPosUseCases({
      sales,
      membership,
      inventory,
      loyaltyEarn,
      idFactory: () => `pos-id-${++n}`,
    });

    const result = await pos.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09121112233",
      tenderType: "cash",
      lines: [
        {
          productId: "p1",
          productName: "شیر",
          quantity: 1,
          unitPriceMinor: 200_000n,
        },
      ],
      idempotencyKey: "k-pos-loyalty",
    });

    expect(result.created).toBe(true);
    const wallet = await loyalty.useCases.getWallet({
      membershipId: "mem-pos",
    });
    expect(wallet?.balance).toBe(2);
    expect(wallet?.storeMembershipId).toBe("mem-pos");
  });

  it("scopes wallets per membership (no cross-store pooling)", async () => {
    const { useCases } = createLoyaltyHarness();
    await useCases.earnPointsForSale({
      saleId: "s-a",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-a",
      customerId: "cust-same",
      totalAmountMinor: 100_000n,
    });
    await useCases.earnPointsForSale({
      saleId: "s-b",
      merchantId: "m1",
      storeId: "s2",
      membershipId: "mem-b",
      customerId: "cust-same",
      totalAmountMinor: 200_000n,
    });

    const a = await useCases.getWallet({ membershipId: "mem-a" });
    const b = await useCases.getWallet({ membershipId: "mem-b" });
    expect(a?.balance).toBe(1);
    expect(b?.balance).toBe(2);
    expect(a?.id).not.toBe(b?.id);
  });

  it("exposes Persian domain error copy for wallet/rule misses", () => {
    expect(LOYALTY_ERROR_MESSAGES_FA.WALLET_NOT_FOUND).toMatch(/کیف امتیاز/);
    expect(LOYALTY_ERROR_MESSAGES_FA.RULE_NOT_FOUND).toMatch(/قانون امتیاز/);
    expect(new LoyaltyDomainError("INVALID_POINTS").messageFa).toMatch(
      /امتیاز/,
    );
  });

  it("runLoyaltyPointsExpiryJob expires wallets and enqueues PointsExpired", async () => {
    let now = new Date("2024-01-15T10:00:00.000Z");
    const harness = createLoyaltyHarness({ now: () => now });
    await harness.useCases.earnPointsForSale({
      saleId: "sale-job",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-job",
      customerId: "cust-job",
      totalAmountMinor: 100_000n,
    });
    now = addCalendarMonths(now, 12);
    const outbox = new InMemoryOutboxStore();
    const result = await runLoyaltyPointsExpiryJob({
      loyalty: harness.useCases,
      outbox,
      now: () => now,
    });
    expect(result.status).toBe("completed");
    expect(result.expiredCount).toBe(1);
    const pending = await outbox.pollPending(10);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.envelope.eventType).toBe("PointsExpired");
    const wallet = await harness.useCases.getWallet({
      membershipId: "mem-job",
    });
    expect(wallet?.balance).toBe(0);
  });

  it("ADR-145: earnPointsForOrder earns points on online pickup order and is idempotent", async () => {
    const { useCases, ledger } = createLoyaltyHarness();

    const input = {
      orderId: "order-100",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-online",
      customerId: "cust-online",
      totalAmountMinor: 300_000,
    };

    const first = await useCases.earnPointsForOrder(input);
    expect(first.created).toBe(true);
    expect(first.points).toBe(3);
    expect(first.wallet.balance).toBe(3);
    expect(first.event?.eventName).toBe("PointsEarned");

    const foundLedger = await ledger.findEarnByOrderId("order-100");
    expect(foundLedger).not.toBeNull();
    expect(foundLedger?.referenceId).toBe("order-100");

    const second = await useCases.earnPointsForOrder(input);
    expect(second.created).toBe(false);
    expect(second.points).toBe(0);
    expect(second.wallet.balance).toBe(3);
    expect(second.event).toBeNull();
  });

  it("ADR-145: createLoyaltyOutboxHandler handles OrderPaid event", async () => {
    const { useCases, ledger } = createLoyaltyHarness();
    const { createLoyaltyOutboxHandler } = await import("./application/outbox-handler.js");
    const handler = createLoyaltyOutboxHandler({ useCases });

    const payload = {
      orderId: "order-200",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem-outbox",
      customerId: "cust-outbox",
      totalAmountMinor: 200_000,
    };

    await handler({
      id: "msg-1",
      eventId: "evt-1",
      eventType: "OrderPaid",
      merchantId: "m1",
      storeId: "s1",
      aggregateId: "order-200",
      aggregateType: "Order",
      envelope: {
        eventId: "evt-1",
        eventType: "OrderPaid",
        merchantId: "m1",
        storeId: "s1",
        aggregateId: "order-200",
        aggregateType: "Order",
        payload,
        payloadVersion: 1,
        correlationId: "corr-1",
        causationId: null,
        occurredAt: new Date(),
      },
      payloadVersion: 1,
      correlationId: "corr-1",
      causationId: null,
      occurredAt: new Date(),
      createdAt: new Date(),
      publishedAt: null,
      attemptCount: 1,
      lastError: null,
    });

    const wallet = await useCases.getWallet({ membershipId: "mem-outbox" });
    expect(wallet?.balance).toBe(2);

    const foundLedger = await ledger.findEarnByOrderId("order-200");
    expect(foundLedger).not.toBeNull();
  });
});
