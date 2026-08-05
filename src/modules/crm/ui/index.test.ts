import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../uiuxpromax-gate/index.js";
import {
  CRM_SEGMENT_POLICY,
  computeMembershipSegment,
} from "../domain/segments.js";
import {
  CRM_UI_COPY_FA,
  formatCrmJalali,
  formatCrmToman,
  segmentLabelFa,
} from "./index.js";

describe("ADR-098 CRM merchant UI", () => {
  it("passes uiuxpromax Persian+RTL brief gate for CRM", () => {
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
    expect(CRM_UI_COPY_FA.customersTitle).toMatch(/مشتری/);
    expect(CRM_UI_COPY_FA.emptyCustomers).toMatch(/[\u0600-\u06FF]/);
    expect(CRM_UI_COPY_FA.segmentLapsed).toMatch(/بازمانده/);
    expect(CRM_UI_COPY_FA.searchPhonePlaceholder).toMatch(/۰۹|09/);
    expect(formatCrmToman(100_000)).toMatch(/تومان/);
    expect(segmentLabelFa("returning")).toBe(CRM_UI_COPY_FA.segmentReturning);
    expect(formatCrmJalali("2026-08-05T09:00:00.000Z")).toMatch(
      /[\u06F0-\u06F9\d]/,
    );
  });

  it("documents segment thresholds used by UI filters", () => {
    expect(CRM_SEGMENT_POLICY.lapsedAfterDays).toBe(60);
    expect(CRM_SEGMENT_POLICY.returningMinPurchases).toBe(2);
    expect(
      computeMembershipSegment({
        completedSales: [],
      }),
    ).toBe("new");
  });
});
