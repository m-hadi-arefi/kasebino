import { describe, expect, it } from "vitest";
import { SERVER_STATE_OWNERSHIP, STATE_MANAGEMENT_PATHS } from "../state-management/index.js";
import {
  DATA_FETCHING_DECISION,
  DATA_FETCHING_LIBRARY,
  DATA_FETCHING_PATHS,
  DATA_FETCHING_STRATEGY,
  FORBIDDEN_FETCH_PATTERNS,
  PERSIAN_FETCH_PLACEHOLDERS,
  STALE_TIMES_MS,
  assertAuthOnClientFetch,
  assertNotForbiddenFetchPattern,
  assertPosAvoidsRscWaterfall,
  buildScopedQueryKey,
  cachePersianPayload,
  clearQueryCacheOnLogout,
  createMerchantQueryClient,
  isForbiddenFetchPattern,
  selectFetchMode,
  staleTimeForSurface,
  MerchantQueryProvider,
  assertNoTokenInQueryKey,
} from "./index.js";

describe("ADR-026 Data Fetching Strategy", () => {
  it("maps RSC, TanStack Query, and Route Handler surfaces", () => {
    expect(DATA_FETCHING_DECISION.adr).toBe("ADR-026");
    expect(DATA_FETCHING_DECISION.rscWherePossible).toBe(true);
    expect(DATA_FETCHING_DECISION.avoidRscWaterfallsOnPos).toBe(true);
    expect(DATA_FETCHING_DECISION.noAdHocUseEffectFetch).toBe(true);
    expect(selectFetchMode({ surface: "dashboard" })).toBe("rsc");
    expect(selectFetchMode({ surface: "marketing" })).toBe("rsc");
    expect(selectFetchMode({ surface: "pos" })).toBe("tanstack_query");
    expect(selectFetchMode({ surface: "crm" })).toBe("tanstack_query");
    expect(selectFetchMode({ surface: "public_json" })).toBe("route_handler");
    expect(selectFetchMode({ surface: "mobile_json" })).toBe("route_handler");
    expect(
      selectFetchMode({ surface: "dashboard", interactiveClientIsland: true }),
    ).toBe("tanstack_query");
    expect(DATA_FETCHING_STRATEGY.decision).toEqual(DATA_FETCHING_DECISION);
  });

  it("installs TanStack Query with shorter POS stale times", () => {
    expect(DATA_FETCHING_LIBRARY.package).toBe("@tanstack/react-query");
    expect(DATA_FETCHING_LIBRARY.installed).toBe(true);
    expect(STALE_TIMES_MS.pos).toBeLessThan(STALE_TIMES_MS.crm);
    expect(STALE_TIMES_MS.pos_product_search).toBeLessThan(STALE_TIMES_MS.pos);
    expect(staleTimeForSurface("pos")).toBe(STALE_TIMES_MS.pos);

    const client = createMerchantQueryClient();
    expect(
      client.getDefaultOptions().queries?.staleTime,
    ).toBe(STALE_TIMES_MS.crm);
    client.clear();
  });

  it("forbids ad-hoc useEffect fetch and POS RSC waterfalls", () => {
    expect(FORBIDDEN_FETCH_PATTERNS).toEqual(
      expect.arrayContaining([
        "ad_hoc_fetch_in_useEffect",
        "rsc_waterfall_on_pos",
        "client_only_spa_default",
        "tokens_in_query_keys",
      ]),
    );
    expect(isForbiddenFetchPattern("ad_hoc_fetch_in_useEffect")).toBe(true);
    expect(() =>
      assertNotForbiddenFetchPattern("ad_hoc_fetch_in_useEffect"),
    ).toThrow(/Forbidden data-fetching pattern/);
    expect(() =>
      assertNotForbiddenFetchPattern("module_owned_useQuery"),
    ).not.toThrow();
    expect(() =>
      assertPosAvoidsRscWaterfall({
        surface: "pos",
        stackedRscFetches: true,
      }),
    ).toThrow(/RSC waterfalls on POS/);
    expect(() =>
      assertPosAvoidsRscWaterfall({
        surface: "pos",
        stackedRscFetches: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertAuthOnClientFetch({
        requiresAuth: true,
        credentialsIncluded: false,
      }),
    ).toThrow(/credentials/);
    expect(() =>
      assertAuthOnClientFetch({
        requiresAuth: true,
        credentialsIncluded: true,
      }),
    ).not.toThrow();
  });

  it("builds merchant-scoped keys and rejects tokens in keys", () => {
    expect(
      buildScopedQueryKey({ merchantId: "m1", storeId: "s1" }, "products"),
    ).toEqual(["mos", "m1", "s1", "products"]);
    expect(() =>
      assertNoTokenInQueryKey([
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.sig",
      ]),
    ).toThrow(/tokens in query keys/);
    expect(() => assertNoTokenInQueryKey(["catalog", "شیر"])).not.toThrow();
  });

  it("caches Persian payloads and clears on logout", async () => {
    const client = createMerchantQueryClient();
    const title = "شیر پرچرب محلی";
    const cached = await cachePersianPayload(
      client,
      { merchantId: "m1", storeId: "s1" },
      "product",
      { title },
    );
    expect(cached.title).toBe(title);
    clearQueryCacheOnLogout(client);
    expect(
      client.getQueryData(
        buildScopedQueryKey({ merchantId: "m1", storeId: "s1" }, "product"),
      ),
    ).toBeUndefined();
  });

  it("exposes provider stub and paths for shells", () => {
    expect(DATA_FETCHING_PATHS.strategyRoot).toBe("src/data-fetching");
    expect(DATA_FETCHING_PATHS.providerStub).toBe(
      "src/data-fetching/provider.ts",
    );
    expect(typeof MerchantQueryProvider).toBe("function");
    const client = createMerchantQueryClient();
    const node = MerchantQueryProvider({
      client,
      children: "کاتالوگ",
    });
    expect(node).toBeTruthy();
    client.clear();
  });

  it("provides Persian RTL placeholders without English flashes", () => {
    expect(PERSIAN_FETCH_PLACEHOLDERS.lang).toBe("fa");
    expect(PERSIAN_FETCH_PLACEHOLDERS.dir).toBe("rtl");
    expect(PERSIAN_FETCH_PLACEHOLDERS.noEnglishPlaceholderFlash).toBe(true);
    expect(PERSIAN_FETCH_PLACEHOLDERS.loading).toMatch(/بارگذاری/);
    expect(PERSIAN_FETCH_PLACEHOLDERS.empty).toMatch(/یافت نشد/);
    expect(PERSIAN_FETCH_PLACEHOLDERS.error).toMatch(/خطا/);
    for (const value of [
      PERSIAN_FETCH_PLACEHOLDERS.loading,
      PERSIAN_FETCH_PLACEHOLDERS.empty,
      PERSIAN_FETCH_PLACEHOLDERS.error,
    ]) {
      expect(value).not.toMatch(/loading|error|empty/i);
    }
  });

  it("wires state-management ownership to this package", () => {
    expect(SERVER_STATE_OWNERSHIP.owner).toBe("tanstack_query");
    expect(SERVER_STATE_OWNERSHIP.implementedInAdr).toBe("ADR-026");
    expect(SERVER_STATE_OWNERSHIP.installDeferredToAdr026).toBe(false);
    expect(STATE_MANAGEMENT_PATHS.sharedQuery).toBe("src/data-fetching");
  });
});
