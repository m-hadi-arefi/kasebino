import { describe, expect, it } from "vitest";
import {
  CLIENT_STATE_LIBRARIES,
  FORBIDDEN_STATE_PATTERNS,
  LOGOUT_STATE_CLEAR,
  PERSIAN_STATE_PLACEHOLDERS,
  SERVER_STATE_OWNERSHIP,
  STATE_IRANIAN_RULES,
  STATE_MANAGEMENT_DECISION,
  STATE_MANAGEMENT_PATHS,
  STATE_MANAGEMENT_STRATEGY,
  URL_STATE_OWNERSHIP,
  assertNotForbiddenStatePattern,
  assertPersianPayloadPreserved,
  assertReduxNotMandated,
  assertServerStateNotInZustand,
  classifyStateOwner,
  createPosCartStore,
  isForbiddenStatePattern,
  parseFilterSearchParams,
  serializeFilterSearchParams,
} from "./index.js";

describe("ADR-025 State Management Strategy", () => {
  it("separates server state (fetching lib later) from client UI and POS cart", () => {
    expect(STATE_MANAGEMENT_DECISION.adr).toBe("ADR-025");
    expect(STATE_MANAGEMENT_DECISION.serverState).toBe("tanstack_query");
    expect(STATE_MANAGEMENT_DECISION.serverStateViaFetchingLib).toBe(true);
    expect(STATE_MANAGEMENT_DECISION.clientUiState).toBe("local_or_context");
    expect(STATE_MANAGEMENT_DECISION.posCart).toBe("zustand_client");
    expect(STATE_MANAGEMENT_DECISION.filterState).toBe("url_search_params");
    expect(SERVER_STATE_OWNERSHIP.installDeferredToAdr026).toBe(false);
    expect(SERVER_STATE_OWNERSHIP.implementedInAdr).toBe("ADR-026");
    expect(SERVER_STATE_OWNERSHIP.forbidMirrorIntoZustand).toBe(true);
    expect(CLIENT_STATE_LIBRARIES.posCartAndEphemeral).toBe("zustand");
    expect(CLIENT_STATE_LIBRARIES.localUi).toContain("useState");
    expect(CLIENT_STATE_LIBRARIES.crossTreeUi).toBe("react_context");
    expect(STATE_MANAGEMENT_STRATEGY.decision).toEqual(
      STATE_MANAGEMENT_DECISION,
    );
  });

  it("does not mandate Redux and forbids anti-patterns", () => {
    expect(STATE_MANAGEMENT_DECISION.reduxMandated).toBe(false);
    expect(() => assertReduxNotMandated()).not.toThrow();
    expect(FORBIDDEN_STATE_PATTERNS).toEqual(
      expect.arrayContaining([
        "redux_as_default_architecture",
        "mirror_server_lists_into_zustand",
        "fetching_inside_zustand",
        "mega_store_across_bounded_contexts",
      ]),
    );
    expect(isForbiddenStatePattern("redux_as_default_architecture")).toBe(
      true,
    );
    expect(() =>
      assertNotForbiddenStatePattern("redux_as_default_architecture"),
    ).toThrow(/Forbidden state pattern/);
    expect(() => assertNotForbiddenStatePattern("local_useState")).not.toThrow();
    expect(() =>
      assertServerStateNotInZustand({ mirrorsServerList: true }),
    ).toThrow(/fetching library/);
    expect(() =>
      assertServerStateNotInZustand({ mirrorsServerList: false }),
    ).not.toThrow();
  });

  it("classifies owners for server, cart, filters, and local UI", () => {
    expect(
      classifyStateOwner({
        isServerData: true,
        isPosCart: false,
        isFilterOrDeepLink: false,
      }),
    ).toBe("server_fetching_lib");
    expect(
      classifyStateOwner({
        isServerData: false,
        isPosCart: true,
        isFilterOrDeepLink: false,
      }),
    ).toBe("zustand_pos_cart");
    expect(
      classifyStateOwner({
        isServerData: false,
        isPosCart: false,
        isFilterOrDeepLink: true,
      }),
    ).toBe("url_filters");
    expect(
      classifyStateOwner({
        isServerData: false,
        isPosCart: false,
        isFilterOrDeepLink: false,
        crossesDistantTree: true,
      }),
    ).toBe("react_context");
    expect(
      classifyStateOwner({
        isServerData: false,
        isPosCart: false,
        isFilterOrDeepLink: false,
      }),
    ).toBe("local_ui");
  });

  it("declares paths for strategy, POS cart UI, and data-fetching root", () => {
    expect(STATE_MANAGEMENT_PATHS.strategyRoot).toBe("src/state-management");
    expect(STATE_MANAGEMENT_PATHS.posCartUiState).toBe(
      "src/modules/pos/ui/state",
    );
    expect(STATE_MANAGEMENT_PATHS.sharedQuery).toBe("src/data-fetching");
    expect(URL_STATE_OWNERSHIP.useFor).toEqual(
      expect.arrayContaining(["filters", "deep_links"]),
    );
  });

  it("round-trips Persian filter text through URL state", () => {
    const serialized = serializeFilterSearchParams({
      q: "شیر پرچرب",
      sort: "name",
      page: 2,
      extras: { دسته: "لبنیات" },
    });
    expect(serialized).toContain("q=");
    const parsed = parseFilterSearchParams(serialized);
    expect(parsed.q).toBe("شیر پرچرب");
    expect(parsed.sort).toBe("name");
    expect(parsed.page).toBe(2);
    expect(parsed.extras?.["دسته"]).toBe("لبنیات");
    expect(URL_STATE_OWNERSHIP.preservePersianUnicode).toBe(true);
  });

  it("keeps POS cart as client state with Persian names and logout clear", () => {
    const store = createPosCartStore();
    store.getState().setScope("m1", "s1");
    store.getState().addLine({
      productId: "p1",
      productName: "نان سنگک",
      quantity: 2,
      unitPriceMinor: 50_000,
    });
    store.getState().setCustomerPhoneDraft("09123456789");
    store.getState().addLine({
      productId: "p1",
      productName: "نان سنگک",
      quantity: 1,
      unitPriceMinor: 50_000,
    });

    const lines = store.getState().lines;
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(3);
    expect(lines[0]?.productName).toBe("نان سنگک");
    assertPersianPayloadPreserved("نان سنگک", lines[0]!.productName);

    store.getState().updateQuantity("p1", 0);
    expect(store.getState().lines).toHaveLength(0);

    store.getState().addLine({
      productId: "p2",
      productName: "دوغ محلی",
      quantity: 1,
      unitPriceMinor: 20_000,
    });
    expect(LOGOUT_STATE_CLEAR.clearPosCart).toBe(true);
    expect(LOGOUT_STATE_CLEAR.clearTanStackQueryCache).toBe(true);
    store.getState().clearOnLogout();
    expect(store.getState().lines).toEqual([]);
    expect(store.getState().merchantId).toBeNull();
    expect(store.getState().storeId).toBeNull();
    expect(store.getState().customerPhoneDraft).toBeNull();
  });

  it("provides Persian RTL placeholders without English flashes", () => {
    expect(STATE_IRANIAN_RULES.lang).toBe("fa");
    expect(STATE_IRANIAN_RULES.dir).toBe("rtl");
    expect(STATE_IRANIAN_RULES.noEnglishPlaceholderFlash).toBe(true);
    expect(STATE_IRANIAN_RULES.displayCurrencyUnit).toBe("تومان");
    expect(PERSIAN_STATE_PLACEHOLDERS.loading).toMatch(/بارگذاری/);
    expect(PERSIAN_STATE_PLACEHOLDERS.empty).toMatch(/یافت نشد/);
    expect(PERSIAN_STATE_PLACEHOLDERS.error).toMatch(/خطا/);
    expect(PERSIAN_STATE_PLACEHOLDERS.cartEmpty).toMatch(/سبد/);
    expect(PERSIAN_STATE_PLACEHOLDERS.dir).toBe("rtl");
    expect(PERSIAN_STATE_PLACEHOLDERS.lang).toBe("fa");
    for (const value of [
      PERSIAN_STATE_PLACEHOLDERS.loading,
      PERSIAN_STATE_PLACEHOLDERS.empty,
      PERSIAN_STATE_PLACEHOLDERS.error,
      PERSIAN_STATE_PLACEHOLDERS.cartEmpty,
    ]) {
      expect(value).not.toMatch(/loading|error|empty|cart/i);
    }
  });
});
