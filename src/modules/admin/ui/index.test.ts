import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../shared/contracts/uiuxpromax-gate/index.js";
import { ADMIN_UI_COPY_FA, merchantStatusLabelFa } from "./copy.js";

describe("admin UI (ADR-106)", () => {
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

  it("ships Persian admin copy", () => {
    expect(ADMIN_UI_COPY_FA.merchantsTitle).toMatch(/[\u0600-\u06FF]/);
    expect(merchantStatusLabelFa("suspended")).toBe(
      ADMIN_UI_COPY_FA.statusSuspended,
    );
  });
});
