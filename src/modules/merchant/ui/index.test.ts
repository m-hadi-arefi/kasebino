import { describe, expect, it } from "vitest";

import { assertUiuxGate } from "../../../shared/contracts/uiuxpromax-gate/index.js";
import {
  ONBOARDING_UI_COPY_FA,
  ONBOARDING_UIUX_GATE,
  STORE_SLUG_POLICY,
  STORE_SWITCHER_UI_COPY_FA,
} from "./index.js";
import { parseActiveStoreCookie } from "../../../infrastructure/auth/active-store.js";

describe("ADR-121 merchant onboarding UI", () => {
  it("passes uiuxpromax Persian+RTL brief gate", () => {
    expect(() =>
      assertUiuxGate({
        gatePassed: ONBOARDING_UIUX_GATE.gatePassed,
        skillPresent: ONBOARDING_UIUX_GATE.skillPresent,
        docsPresent: ONBOARDING_UIUX_GATE.docsPresent,
        uiInScope: ONBOARDING_UIUX_GATE.uiInScope,
        brief: { ...ONBOARDING_UIUX_GATE.brief },
      }),
    ).not.toThrow();
    expect(ONBOARDING_UI_COPY_FA.title).toMatch(/[\u0600-\u06FF]/);
    expect(ONBOARDING_UI_COPY_FA.finishCta).toMatch(/تکمیل/);
    expect(STORE_SWITCHER_UI_COPY_FA.label).toMatch(/فروشگاه/);
  });

  it("documents immutable slug after publish", () => {
    expect(STORE_SLUG_POLICY.immutableAfterPublish).toBe(true);
  });

  it("parses active-store cookie", () => {
    expect(
      parseActiveStoreCookie("foo=1; mos-active-store-id=store-abc; bar=2"),
    ).toBe("store-abc");
    expect(parseActiveStoreCookie(null)).toBeNull();
  });
});
