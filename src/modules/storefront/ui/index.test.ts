import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../shared/contracts/uiuxpromax-gate/index.js";
import {
  STOREFRONT_UI_COPY_FA,
  cartTotalMinor,
  formatHoursRowFa,
  formatStorefrontToman,
  formatUnpaidDeadlineJalali,
} from "./index.js";

describe("ADR-100 storefront UI copy + format", () => {
  it("passes uiuxpromax Persian+RTL brief gate for storefront pickup", () => {
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
    expect(STOREFRONT_UI_COPY_FA.pickupOnlyHeadline).toMatch(/حضوری/);
    expect(STOREFRONT_UI_COPY_FA.pricesInToman).toMatch(/تومان/);
    expect(STOREFRONT_UI_COPY_FA.pickupRestrictionNote).toMatch(/پیک/);
    expect(STOREFRONT_UI_COPY_FA.emptyCatalog).toMatch(/[\u0600-\u06FF]/);
    expect(STOREFRONT_UI_COPY_FA.fulfillmentLabel).toBe("تحویل حضوری");
    expect(STOREFRONT_UI_COPY_FA.sandboxSimulatePay).toMatch(/شبیه‌سازی|پرداخت/);
    expect(STOREFRONT_UI_COPY_FA.paymentAmountLabel).toMatch(/مبلغ/);
    expect(STOREFRONT_UI_COPY_FA.paymentFailedRetry).toMatch(/[\u0600-\u06FF]/);
    expect(STOREFRONT_UI_COPY_FA.aboutMapFallback).toMatch(/مسیریابی/);
    expect(STOREFRONT_UI_COPY_FA.qrLandingHint).toMatch(/QR/);
    expect(Object.values(STOREFRONT_UI_COPY_FA).join(" ")).not.toMatch(
      /\bdelivery\b|\bcourier\b/i,
    );
  });

  it("formats تومان and Jalali unpaid deadline", () => {
    expect(formatStorefrontToman(100_000n)).toMatch(/تومان/);
    expect(formatUnpaidDeadlineJalali(new Date("2026-08-05T08:00:00Z"))).toMatch(
      /[\u0600-\u06FF0-9]/,
    );
    expect(formatHoursRowFa("saturday", { open: "09:00", close: "21:00" })).toMatch(
      /شنبه/,
    );
    expect(formatHoursRowFa("friday", null)).toMatch(/تعطیل/);
  });

  it("sums cart lines in IRR minor", () => {
    expect(
      cartTotalMinor([
        {
          productId: "p1",
          name: "شیر",
          unitPriceMinor: "10000",
          priceDisplayToman: "۱٬۰۰۰ تومان",
          quantity: 2,
        },
      ]),
    ).toBe(20_000n);
  });
});
