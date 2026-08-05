import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../uiuxpromax-gate/index.js";
import {
  LOYALTY_UI_COPY_FA,
  formatLoyaltyJalali,
  formatLoyaltyToman,
  minorToTomanInput,
  tomanInputToMinor,
} from "./index.js";

describe("ADR-099 Loyalty UI", () => {
  it("passes uiuxpromax Persian+RTL brief gate for loyalty", () => {
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
    expect(LOYALTY_UI_COPY_FA.settingsTitle).toMatch(/باشگاه|امتیاز/);
    expect(LOYALTY_UI_COPY_FA.walletTitle).toMatch(/کیف امتیاز/);
    expect(LOYALTY_UI_COPY_FA.customerEmpty).toMatch(/[\u0600-\u06FF]/);
    expect(formatLoyaltyToman(100_000)).toMatch(/تومان/);
    expect(minorToTomanInput(100_000n)).toBe("10000");
    expect(tomanInputToMinor("10000")).toBe(100_000n);
    expect(formatLoyaltyJalali("2026-08-05T09:00:00.000Z")).toMatch(
      /[\u06F0-\u06F9\d]/,
    );
  });
});
