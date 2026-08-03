import { describe, expect, it } from "vitest";

import {
  POS_SALES,
  POS_SALES_DECISION,
  POS_SPEED_NOTES_FA,
  TENDER_LABELS_FA,
  assertCheckoutBudgetSeconds,
  assertPosTenderType,
} from "./index.js";

describe("ADR-009 POS sales contract", () => {
  it("locks CompleteSale UoW + tender enum + phone + idempotency", () => {
    expect(POS_SALES_DECISION.completeSaleUnitOfWork).toBe(true);
    expect(POS_SALES_DECISION.phoneRequired).toBe(true);
    expect(POS_SALES_DECISION.idempotencyRequired).toBe(true);
    expect(POS_SALES_DECISION.tenderTypes).toEqual([
      "cash",
      "card_terminal",
      "mixed",
    ]);
    expect(POS_SALES_DECISION.cardAcquiringInScope).toBe(false);
    expect(POS_SALES_DECISION.loyaltyEarnPort).toBe("LoyaltyEarnPort");
    expect(POS_SALES_DECISION.loyaltyModule).toBe("loyalty");
    expect(POS_SALES_DECISION.primaryCompletionEvent).toBe("SaleCompleted");
    expect(POS_SALES.events).toContain("SaleCompleted");
    expect(POS_SALES_DECISION.analyticsOnCriticalPath).toBe(false);
    expect(POS_SALES_DECISION.analyticsIngestIsolationAdr).toBe("ADR-065");
    expect(POS_SALES_DECISION.analyticsIngestIsolationPackage).toBe(
      "src/analytics-ingest-isolation/",
    );
  });

  it("exposes Persian tender labels and speed notes", () => {
    expect(TENDER_LABELS_FA.cash).toBe("نقد");
    expect(TENDER_LABELS_FA.card_terminal).toBe("کارت‌خوان");
    expect(TENDER_LABELS_FA.mixed).toBe("ترکیبی");
    expect(POS_SPEED_NOTES_FA.checkoutBudget).toMatch(/[\u0600-\u06FF]/);
    expect(POS_SPEED_NOTES_FA.phoneCapture).toMatch(/[\u0600-\u06FF]/);
    expect(() => assertCheckoutBudgetSeconds(5)).not.toThrow();
    expect(() => assertPosTenderType("cash")).not.toThrow();
  });
});
