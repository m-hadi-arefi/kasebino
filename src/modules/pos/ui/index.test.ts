import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../uiuxpromax-gate/index.js";
import { InMemoryOutboxStore } from "../../../outbox/index.js";
import { envelopeFromDomainEvent } from "../../../event-driven/index.js";
import {
  InMemorySaleRepository,
  createPosUseCases,
  type InventoryDecrementPort,
  type MembershipUpsertPort,
  type SaleOutboxPort,
} from "../index.js";
import {
  POS_UI_COPY_FA,
  cartTotalMinor,
  formatPosJalaliDateTime,
  formatPosToman,
} from "./index.js";
import { saleDto } from "../../../infrastructure/http/dtos.js";
import { createCompletedSaleAggregate } from "../domain/sale.js";

describe("ADR-096 POS UI + CompleteSale outbox", () => {
  it("passes uiuxpromax Persian+RTL brief gate for POS", () => {
    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: true,
        docsPresent: true,
        uiInScope: true,
        brief: {
          persian: true,
          rtl: true,
          faIrPersona: true,
          mobile390: true,
          iranianRetailContext: true,
          screenListDocumented: true,
          statesDocumented: true,
          a11yNotes: true,
        },
      }),
    ).not.toThrow();
    expect(POS_UI_COPY_FA.consentNotice).toMatch(/[\u0600-\u06FF]/);
    expect(POS_UI_COPY_FA.title).toMatch(/صندوق/);
    expect(POS_UI_COPY_FA.cartEmpty).toMatch(/[\u0600-\u06FF]/);
  });

  it("formats تومان totals and Jalali receipt timestamps", () => {
    expect(formatPosToman(50_000)).toMatch(/تومان/);
    expect(
      cartTotalMinor([
        { quantity: 2, unitPriceMinor: 10_000 },
        { quantity: 1, unitPriceMinor: 5_000 },
      ]),
    ).toBe(25_000);
    const jalali = formatPosJalaliDateTime("2026-03-21T12:00:00.000Z");
    expect(jalali.length).toBeGreaterThan(4);
  });

  it("enqueues SaleCreated + SaleCompleted on CompleteSale", async () => {
    const sales = new InMemorySaleRepository();
    const outbox = new InMemoryOutboxStore();
    const membership: MembershipUpsertPort = {
      async upsertFromPosPhoneCapture() {
        return {
          membershipId: "mem-1",
          customerId: "cust-1",
          phoneNational: "09123456789",
          created: true,
        };
      },
    };
    const inventory: InventoryDecrementPort = {
      async decrementForSale() {},
    };
    const saleOutbox: SaleOutboxPort = {
      async enqueueSaleEvents(input) {
        await outbox.enqueue({
          envelope: envelopeFromDomainEvent({
            domainEvent: input.createdEvent,
            merchantId: input.merchantId,
            storeId: input.storeId,
          }),
          aggregateId: input.createdEvent.aggregateId,
          aggregateType: input.createdEvent.aggregateType,
        });
        await outbox.enqueue({
          envelope: envelopeFromDomainEvent({
            domainEvent: input.completedEvent,
            merchantId: input.merchantId,
            storeId: input.storeId,
          }),
          aggregateId: input.completedEvent.aggregateId,
          aggregateType: input.completedEvent.aggregateType,
        });
      },
    };

    const useCases = createPosUseCases({
      sales,
      membership,
      inventory,
      outbox: saleOutbox,
      idFactory: () => "sale-fixed",
    });

    const created = await useCases.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09123456789",
      tenderType: "cash",
      idempotencyKey: "idem-096",
      lines: [
        {
          productId: "p1",
          productName: "نان",
          quantity: 1,
          unitPriceMinor: 20_000n,
        },
      ],
    });
    expect(created.created).toBe(true);
    const pending = await outbox.pollPending(10);
    expect(pending).toHaveLength(2);
    expect(pending.map((m) => m.eventType).sort()).toEqual([
      "SaleCompleted",
      "SaleCreated",
    ]);

    const replay = await useCases.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09123456789",
      tenderType: "cash",
      idempotencyKey: "idem-096",
      lines: [
        {
          productId: "p1",
          productName: "نان",
          quantity: 1,
          unitPriceMinor: 20_000n,
        },
      ],
    });
    expect(replay.created).toBe(false);
    expect(await outbox.pollPending(10)).toHaveLength(2);
  });

  it("saleDto exposes receiptRef as sale id + تومان display", () => {
    const sale = createCompletedSaleAggregate({
      id: "rcpt-1",
      merchantId: "m1",
      storeId: "s1",
      membershipId: "mem",
      customerId: "cust",
      phoneNational: "09120000000",
      tenderType: "cash",
      idempotencyKey: "k",
      lines: [
        {
          id: "l1",
          productId: "p1",
          productName: "شیر",
          quantity: 1,
          unitPriceMinor: 100_000n,
        },
      ],
    });
    const dto = saleDto(sale);
    expect(dto.receiptRef).toBe("rcpt-1");
    expect(dto.totalDisplayToman).toMatch(/تومان/);
  });
});
