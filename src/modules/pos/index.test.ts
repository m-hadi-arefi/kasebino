import { describe, expect, it, vi } from "vitest";

import { formatTomanDisplay, moneyFromMinor } from "../../shared/domain/money.js";
import {
  POS_ERROR_MESSAGES_FA,
  PosDomainError,
  InMemorySaleRepository,
  createPosUseCases,
  type AnalyticsAfterSalePort,
  type InventoryDecrementPort,
  type LoyaltyEarnPort,
  type MembershipUpsertPort,
} from "./index.js";

function createMembershipFake(
  overrides?: Partial<MembershipUpsertPort>,
): MembershipUpsertPort & {
  calls: Parameters<MembershipUpsertPort["upsertFromPosPhoneCapture"]>[0][];
} {
  const calls: Parameters<
    MembershipUpsertPort["upsertFromPosPhoneCapture"]
  >[0][] = [];
  return {
    calls,
    async upsertFromPosPhoneCapture(input) {
      calls.push(input);
      return {
        membershipId: "mem-1",
        customerId: "cust-1",
        phoneNational: "09123456789",
        created: true,
      };
    },
    ...overrides,
  };
}

function createInventoryFake(): InventoryDecrementPort & {
  calls: Parameters<InventoryDecrementPort["decrementForSale"]>[0][];
} {
  const calls: Parameters<InventoryDecrementPort["decrementForSale"]>[0][] =
    [];
  return {
    calls,
    async decrementForSale(input) {
      calls.push(input);
    },
  };
}

function createHarness(opts?: {
  membership?: MembershipUpsertPort;
  inventory?: InventoryDecrementPort;
  loyaltyEarn?: LoyaltyEarnPort;
  analyticsAfterSale?: AnalyticsAfterSalePort;
}) {
  const sales = new InMemorySaleRepository();
  const membership = opts?.membership ?? createMembershipFake();
  const inventory = opts?.inventory ?? createInventoryFake();
  let n = 0;
  const useCases = createPosUseCases({
    sales,
    membership,
    inventory,
    ...(opts?.loyaltyEarn ? { loyaltyEarn: opts.loyaltyEarn } : {}),
    ...(opts?.analyticsAfterSale
      ? { analyticsAfterSale: opts.analyticsAfterSale }
      : {}),
    idFactory: () => `id-${++n}`,
    now: (() => {
      let t = 1_700_000_000_000;
      return () => new Date(t++);
    })(),
  });
  return { sales, membership, inventory, useCases };
}

const baseLines = [
  {
    productId: "prod-1",
    productName: "نان سنگک",
    quantity: 2,
    unitPriceMinor: 50_000n, // 5_000 تومان
  },
];

describe("ADR-009 POS and Sales Domain", () => {
  it("completes sale with cash tender, membership + inventory orchestration", async () => {
    const membership = createMembershipFake();
    const inventory = createInventoryFake();
    const { useCases } = createHarness({ membership, inventory });

    const result = await useCases.completeSale({
      merchantId: "merchant-1",
      storeId: "store-1",
      phone: "09123456789",
      tenderType: "cash",
      lines: baseLines,
      idempotencyKey: "key-1",
    });

    expect(result.created).toBe(true);
    expect(result.sale.status).toBe("completed");
    expect(result.sale.tenderType).toBe("cash");
    expect(result.sale.phoneNational).toBe("09123456789");
    expect(result.sale.membershipId).toBe("mem-1");
    expect(result.sale.customerId).toBe("cust-1");
    expect(result.sale.totalAmountMinor).toBe(100_000n);
    expect(result.sale.lines).toHaveLength(1);
    expect(result.sale.lines[0]?.productName).toBe("نان سنگک");
    expect(result.event.eventName).toBe("SaleCompleted");
    expect(result.event.payload.tenderType).toBe("cash");
    expect(result.createdEvent?.eventName).toBe("SaleCreated");
    expect(result.membershipCreated).toBe(true);

    expect(membership.calls).toHaveLength(1);
    expect(membership.calls[0]).toMatchObject({
      merchantId: "merchant-1",
      storeId: "store-1",
      phone: "09123456789",
    });

    expect(inventory.calls).toHaveLength(1);
    expect(inventory.calls[0]).toEqual({
      merchantId: "merchant-1",
      storeId: "store-1",
      productId: "prod-1",
      quantity: 2,
      sameTransaction: true,
      saleId: "id-1",
    });

    expect(
      formatTomanDisplay(moneyFromMinor(result.sale.totalAmountMinor)),
    ).toMatch(/تومان/);
  });

  it("accepts card_terminal and mixed tenders", async () => {
    const { useCases } = createHarness();

    const card = await useCases.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09120000001",
      tenderType: "card_terminal",
      lines: baseLines,
      idempotencyKey: "key-card",
    });
    expect(card.sale.tenderType).toBe("card_terminal");

    const mixed = await useCases.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09120000001",
      tenderType: "mixed",
      lines: baseLines,
      idempotencyKey: "key-mixed",
    });
    expect(mixed.sale.tenderType).toBe("mixed");
  });

  it("rejects unknown tender with Persian error", async () => {
    const { useCases } = createHarness();

    await expect(
      useCases.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "09120000001",
        tenderType: "crypto",
        lines: baseLines,
        idempotencyKey: "key-bad-tender",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_TENDER",
      messageFa: POS_ERROR_MESSAGES_FA.INVALID_TENDER,
    });

    expect(POS_ERROR_MESSAGES_FA.INVALID_TENDER).toMatch(/[\u0600-\u06FF]/);
    expect(new PosDomainError("EMPTY_CART").messageFa).toMatch(
      /[\u0600-\u06FF]/,
    );
  });

  it("requires phone, non-empty cart, and Idempotency-Key", async () => {
    const { useCases } = createHarness();

    await expect(
      useCases.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "  ",
        tenderType: "cash",
        lines: baseLines,
        idempotencyKey: "k1",
      }),
    ).rejects.toMatchObject({ code: "PHONE_REQUIRED" });

    await expect(
      useCases.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "09120000001",
        tenderType: "cash",
        lines: [],
        idempotencyKey: "k2",
      }),
    ).rejects.toMatchObject({ code: "EMPTY_CART" });

    await expect(
      useCases.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "09120000001",
        tenderType: "cash",
        lines: baseLines,
        idempotencyKey: "",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REQUIRED" });
  });

  it("rejects invalid quantity with Persian error", async () => {
    const { useCases } = createHarness();

    await expect(
      useCases.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "09120000001",
        tenderType: "cash",
        lines: [
          {
            productId: "p1",
            productName: "شیر",
            quantity: 0,
            unitPriceMinor: 1000,
          },
        ],
        idempotencyKey: "k-qty",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_QUANTITY",
      messageFa: POS_ERROR_MESSAGES_FA.INVALID_QUANTITY,
    });
  });

  it("idempotent replay returns same sale without re-calling ports", async () => {
    const membership = createMembershipFake();
    const inventory = createInventoryFake();
    const { useCases } = createHarness({ membership, inventory });

    const first = await useCases.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09123334455",
      tenderType: "cash",
      lines: baseLines,
      idempotencyKey: "idem-same",
    });
    const second = await useCases.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09123334455",
      tenderType: "card_terminal",
      lines: baseLines,
      idempotencyKey: "idem-same",
    });

    expect(second.created).toBe(false);
    expect(second.sale.id).toBe(first.sale.id);
    expect(second.sale.tenderType).toBe("cash");
    expect(second.event.eventName).toBe("SaleCompleted");
    expect(membership.calls).toHaveLength(1);
    expect(inventory.calls).toHaveLength(1);
  });

  it("calls loyalty earn stub when provided", async () => {
    const earnForSale = vi.fn(async () => undefined);
    const { useCases } = createHarness({
      loyaltyEarn: { earnForSale },
    });

    const result = await useCases.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09125556677",
      tenderType: "mixed",
      lines: baseLines,
      idempotencyKey: "key-loyalty",
    });

    expect(earnForSale).toHaveBeenCalledTimes(1);
    expect(earnForSale).toHaveBeenCalledWith(
      expect.objectContaining({
        saleId: result.sale.id,
        membershipId: "mem-1",
        customerId: "cust-1",
        totalAmountMinor: 100_000n,
      }),
    );
  });

  it("idempotency is scoped per merchant", async () => {
    const { useCases } = createHarness();

    const a = await useCases.completeSale({
      merchantId: "merchant-a",
      storeId: "s1",
      phone: "09120000001",
      tenderType: "cash",
      lines: baseLines,
      idempotencyKey: "shared-key",
    });
    const b = await useCases.completeSale({
      merchantId: "merchant-b",
      storeId: "s1",
      phone: "09120000001",
      tenderType: "cash",
      lines: baseLines,
      idempotencyKey: "shared-key",
    });

    expect(a.sale.id).not.toBe(b.sale.id);
    expect(a.created).toBe(true);
    expect(b.created).toBe(true);
  });

  it("CompleteSale succeeds when analytics after-sale throws (ADR-065)", async () => {
    const analyticsAfterSale = {
      enqueueSaleCompleted: vi.fn(async () => {
        throw new Error("mongodb_unavailable");
      }),
    };
    const { useCases, sales } = createHarness({ analyticsAfterSale });

    const result = await useCases.completeSale({
      merchantId: "merchant-1",
      storeId: "store-1",
      phone: "09123456789",
      tenderType: "cash",
      lines: baseLines,
      idempotencyKey: "iso-key-1",
    });

    expect(result.created).toBe(true);
    expect(result.event.eventName).toBe("SaleCompleted");
    expect(await sales.findByIdempotencyKey("merchant-1", "iso-key-1")).not.toBeNull();
    expect(analyticsAfterSale.enqueueSaleCompleted).toHaveBeenCalledOnce();
  });
});
