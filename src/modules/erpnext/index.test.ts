/**
 * ERPNext module tests — Phase 1–4 foundation (ADR-141).
 */

import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../shared/contracts/uiuxpromax-gate/index.js";
import {
  createErpNextUseCases,
  FakeFinanceReader,
  InMemoryErpNextSyncRecordRepository,
  normalizeErpNextErrorFa,
} from "./index.js";
import { createAccountingOutboxHandler, FakeAccountingProvider } from "../accounting/index.js";
import { createOutboxMessage } from "../../events/outbox/index.js";
import { envelopeFromDomainEvent } from "../../events/contracts/event-driven/index.js";
import { ERPNEXT_UIUX_GATE } from "./ui/copy.js";
import {
  markSyncFailed,
  markSyncPending,
  markSyncSynced,
} from "./application/sync-lifecycle.js";

describe("ADR-141 ERPNext capability foundation", () => {
  it("passes uiuxpromax gate for finance UI", () => {
    expect(() => assertUiuxGate(ERPNEXT_UIUX_GATE)).not.toThrow();
  });

  it("normalizes duplicate / timeout errors to Persian", () => {
    expect(normalizeErpNextErrorFa(new Error("Duplicate entry"))).toContain(
      "قبلاً",
    );
    expect(normalizeErpNextErrorFa(new Error("Timeout"))).toContain("ارتباط");
  });

  it("tracks sync pending → synced and lists on finance dashboard", async () => {
    const syncRecords = new InMemoryErpNextSyncRecordRepository();
    const now = () => new Date("2026-08-09T12:00:00.000Z");
    await markSyncPending({
      repo: syncRecords,
      merchantId: "11111111-1111-1111-1111-111111111111",
      storeId: "22222222-2222-2222-2222-222222222222",
      entityType: "sale",
      entityId: "33333333-3333-3333-3333-333333333333",
      eventId: "evt-1",
      idFactory: () => "44444444-4444-4444-4444-444444444444",
      now,
    });
    await markSyncSynced({
      repo: syncRecords,
      merchantId: "11111111-1111-1111-1111-111111111111",
      storeId: "22222222-2222-2222-2222-222222222222",
      entityType: "sale",
      entityId: "33333333-3333-3333-3333-333333333333",
      eventId: "evt-1",
      erpnextId: "ACC-SINV-0001",
      idFactory: () => "44444444-4444-4444-4444-444444444444",
      now,
    });

    const useCases = createErpNextUseCases({
      financeReader: new FakeFinanceReader({ syncRecords }),
      syncRecords,
    });
    const dash = await useCases.getFinanceDashboard({
      merchantId: "11111111-1111-1111-1111-111111111111",
    });
    expect(dash.summary.invoiceCountSynced).toBe(1);
    const status = await useCases.getSaleFinancialStatus({
      merchantId: "11111111-1111-1111-1111-111111111111",
      saleId: "33333333-3333-3333-3333-333333333333",
    });
    expect(status.syncStatus).toBe("synced");
    expect(status.erpnextId).toBe("ACC-SINV-0001");
  });

  it("records failed sync with Persian message without blocking Fake sale post", async () => {
    const syncRecords = new InMemoryErpNextSyncRecordRepository();
    const fake = new FakeAccountingProvider();
    const failing = Object.assign(Object.create(FakeAccountingProvider.prototype), {
      providerId: "fake",
      syncProduct: fake.syncProduct.bind(fake),
      syncCustomer: fake.syncCustomer.bind(fake),
      recordPayment: fake.recordPayment.bind(fake),
      recordInventoryAdjustment: fake.recordInventoryAdjustment.bind(fake),
      recordPurchase: fake.recordPurchase.bind(fake),
      recordReturn: fake.recordReturn.bind(fake),
      async recordSale() {
        throw new Error("ECONNREFUSED");
      },
    });
    const handler = createAccountingOutboxHandler({
      provider: failing,
      syncRecords,
      idFactory: () => "55555555-5555-5555-5555-555555555555",
      now: () => new Date("2026-08-09T12:00:00.000Z"),
    });

    const message = createOutboxMessage({
      envelope: envelopeFromDomainEvent({
        domainEvent: {
          eventName: "SaleCompleted",
          aggregateId: "33333333-3333-3333-3333-333333333333",
          aggregateType: "Sale",
          occurredAt: new Date("2026-08-09T12:00:00.000Z"),
          payload: {
            saleId: "33333333-3333-3333-3333-333333333333",
            totalAmountMinor: "1000",
            lines: [
              {
                productId: "p1",
                quantity: 1,
                unitCode: "piece",
                unitPriceMinor: "1000",
                lineTotalMinor: "1000",
              },
            ],
            idempotencyKey: "k1",
          },
        },
        merchantId: "11111111-1111-1111-1111-111111111111",
        storeId: "22222222-2222-2222-2222-222222222222",
      }),
      aggregateId: "33333333-3333-3333-3333-333333333333",
      aggregateType: "Sale",
    });

    await expect(handler(message)).rejects.toThrow(/ECONNREFUSED/);
    const row = await syncRecords.findByInternal({
      merchantId: "11111111-1111-1111-1111-111111111111",
      entityType: "sale",
      entityId: "33333333-3333-3333-3333-333333333333",
    });
    expect(row?.status).toBe("failed");
    expect(row?.errorMessageFa).toContain("ارتباط");
  });

  it("markSyncFailed is idempotent for retries", async () => {
    const syncRecords = new InMemoryErpNextSyncRecordRepository();
    const now = () => new Date();
    const base = {
      repo: syncRecords,
      merchantId: "m1",
      storeId: null as string | null,
      entityType: "payment",
      entityId: "pay1",
      eventId: "e1",
      idFactory: () => "id1",
      now,
    };
    await markSyncPending(base);
    await markSyncFailed({ ...base, error: new Error("duplicate invoice") });
    await markSyncFailed({ ...base, error: new Error("duplicate invoice") });
    const row = await syncRecords.findByInternal({
      merchantId: "m1",
      entityType: "payment",
      entityId: "pay1",
    });
    expect(row?.status).toBe("failed");
    expect(row?.errorMessageFa).toContain("قبلاً");
  });

  it("queries Chart of Accounts, General Ledger, P&L, Balance Sheet, Trial Balance, Payables, Receivables", async () => {
    const syncRecords = new InMemoryErpNextSyncRecordRepository();
    const useCases = createErpNextUseCases({
      financeReader: new FakeFinanceReader({ syncRecords }),
      syncRecords,
    });
    const merchantId = "11111111-1111-1111-1111-111111111111";

    const coa = await useCases.getChartOfAccounts({ merchantId });
    expect(coa.accounts.length).toBeGreaterThan(0);
    expect(coa.accounts[0]?.accountName).toBeDefined();

    const gl = await useCases.getGeneralLedger({ merchantId });
    expect(gl.entries.length).toBeGreaterThan(0);
    expect(gl.entries[0]?.voucherType).toBe("Sales Invoice");

    const pnl = await useCases.getProfitAndLoss({ merchantId });
    expect(pnl.report.source).toBe("fake");
    expect(pnl.report.totalIncome.amountMinor).toBe("80000000");

    const bs = await useCases.getBalanceSheet({ merchantId });
    expect(bs.report.totalAsset.amountMinor).toBe("50000000");

    const tb = await useCases.getTrialBalance({ merchantId });
    expect(tb.report.rows.length).toBeGreaterThan(0);

    const pay = await useCases.getPayables({ merchantId });
    expect(pay.payables.totalPayable.amountMinor).toBe("0");

    const rec = await useCases.getReceivables({ merchantId });
    expect(rec.receivables.totalReceivable.amountMinor).toBe("0");
  });
});
