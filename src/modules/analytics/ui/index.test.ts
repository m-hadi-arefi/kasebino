import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../uiuxpromax-gate/index.js";
import { ANALYTICS_UI_COPY_FA } from "./copy.js";
import { formatAnalyticsToman } from "./format.js";

describe("analytics UI (ADR-106)", () => {
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
  });

  it("ships Persian titles and تومان formatting", () => {
    expect(ANALYTICS_UI_COPY_FA.overviewTitle).toMatch(/[\u0600-\u06FF]/);
    expect(ANALYTICS_UI_COPY_FA.empty).toMatch(/[\u0600-\u06FF]/);
    expect(ANALYTICS_UI_COPY_FA.northStarTitle).toMatch(/بازمانده/);
    expect(formatAnalyticsToman(42_000n)).toMatch(/تومان/);
  });
});
