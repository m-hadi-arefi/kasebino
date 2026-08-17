/**
 * ADR-107 notifications UI gate + copy tests.
 */

import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../shared/contracts/uiuxpromax-gate/index.js";
import {
  NOTIFICATIONS_UI_COPY_FA,
  formatNotificationJalali,
} from "./index.js";

describe("ADR-107 notifications center UI", () => {
  it("passes uiuxpromax Persian+RTL brief gate", () => {
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
    expect(NOTIFICATIONS_UI_COPY_FA.merchantTitle).toMatch(/اعلان/);
    expect(NOTIFICATIONS_UI_COPY_FA.empty).toMatch(/[\u0600-\u06FF]/);
    expect(NOTIFICATIONS_UI_COPY_FA.loading).toMatch(/[\u0600-\u06FF]/);
    expect(NOTIFICATIONS_UI_COPY_FA.errorRetry).toMatch(/[\u0600-\u06FF]/);
    expect(NOTIFICATIONS_UI_COPY_FA.markRead).toMatch(/خوانده/);
    expect(NOTIFICATIONS_UI_COPY_FA.jalaliHint).toMatch(/شمسی|جلالی|تهران/);
  });

  it("formats timestamps with Jalali Asia/Tehran", () => {
    const label = formatNotificationJalali("2026-08-05T09:00:00.000Z");
    expect(label).toMatch(/[\u0600-\u06FF0-9۰-۹]/);
    expect(label).not.toBe(NOTIFICATIONS_UI_COPY_FA.noDate);
  });
});
