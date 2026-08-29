import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../shared/contracts/uiuxpromax-gate/index.js";
import {
  STORE_HOURS_UI_COPY_FA,
  STORE_LOCATION_UI_COPY_FA,
  STORE_LOCATION_UIUX_GATE,
  STORE_QR_PRINT_UI_COPY_FA,
} from "./index.js";

describe("ADR-104 store location + QR UI", () => {
  it("passes uiuxpromax Persian+RTL brief gate", () => {
    expect(() =>
      assertUiuxGate({
        gatePassed: STORE_LOCATION_UIUX_GATE.gatePassed,
        skillPresent: STORE_LOCATION_UIUX_GATE.skillPresent,
        docsPresent: STORE_LOCATION_UIUX_GATE.docsPresent,
        uiInScope: STORE_LOCATION_UIUX_GATE.uiInScope,
        brief: { ...STORE_LOCATION_UIUX_GATE.brief },
      }),
    ).not.toThrow();
    expect(STORE_LOCATION_UI_COPY_FA.locationTitle).toMatch(/[\u0600-\u06FF]/);
    expect(STORE_QR_PRINT_UI_COPY_FA.stickerCta).toMatch(/اسکن/);
    expect(STORE_QR_PRINT_UI_COPY_FA.printCta).toMatch(/چاپ/);
  });

  it("ADR-155: store hours copy uses Iranian weekdays Saturday–Friday", () => {
    expect(STORE_HOURS_UI_COPY_FA.title).toMatch(/ساعات/);
    expect(STORE_HOURS_UI_COPY_FA.weekday.saturday).toMatch(/شنبه/);
    expect(STORE_HOURS_UI_COPY_FA.weekday.friday).toMatch(/جمعه/);
    expect(STORE_HOURS_UI_COPY_FA.closed).toMatch(/بسته/);
  });
});
