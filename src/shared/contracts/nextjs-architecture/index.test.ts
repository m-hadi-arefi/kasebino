import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_SHELL_LOCALIZATION, DEPLOYABLE } from "../modular-monolith/index.js";
import { LOCALE_DEFAULTS } from "../../architecture/product/index.js";
import {
  APP_SHELL,
  APP_STRUCTURE,
  COMPOSITION_RULES,
  FORBIDDEN_ROUTERS,
  HOST_CROSS_CUTTING,
  NEXTJS_ARCHITECTURE,
  RENDERING_MODEL,
  ROUTER,
  assertAppRouterOnly,
  assertAppShellFaRtl,
  assertNoPagesRouterDirectory,
  assertPresentationCallsApplication,
} from "./index.js";

describe("ADR-016 Next.js application architecture", () => {
  it("hosts the modular monolith on App Router only", () => {
    expect(ROUTER).toBe("app_router");
    expect(FORBIDDEN_ROUTERS).toContain("pages_router");
    expect(DEPLOYABLE.runtime).toBe("nextjs");
    expect(COMPOSITION_RULES.hostRuntime).toBe("nextjs");
    expect(() => assertAppRouterOnly(ROUTER)).not.toThrow();
    expect(() => assertAppRouterOnly("pages_router")).toThrow(/App Router/i);
    expect(NEXTJS_ARCHITECTURE.router).toBe(ROUTER);
  });

  it("defaults to Server Components with minimal client surfaces", () => {
    expect(RENDERING_MODEL.default).toBe("server_components");
    expect(RENDERING_MODEL.clientComponentsMinimal).toBe(true);
    expect(RENDERING_MODEL.routeHandlers).toBe("public_json");
    expect(RENDERING_MODEL.serverActions).toBe("authed_ui_mutations");
  });

  it("locks Iranian First app shell to fa-IR RTL", () => {
    expect(APP_SHELL.htmlLang).toBe("fa");
    expect(APP_SHELL.htmlDir).toBe("rtl");
    expect(APP_SHELL.locale).toBe("fa-IR");
    expect(APP_SHELL.htmlLang).toBe(LOCALE_DEFAULTS.language);
    expect(APP_SHELL.htmlDir).toBe(LOCALE_DEFAULTS.dir);
    expect(APP_SHELL.strategy).toBe(APP_SHELL_LOCALIZATION.strategy);
    expect(() => assertAppShellFaRtl({ lang: "fa", dir: "rtl" })).not.toThrow();
    expect(() => assertAppShellFaRtl({ lang: "en", dir: "ltr" })).toThrow(
      /lang="fa".*dir="rtl"/i,
    );
  });

  it("scaffolds App Router roots and forbids Pages Router directory", () => {
    const root = process.cwd();
    expect(APP_STRUCTURE.routesRoot).toBe("app");
    expect(APP_STRUCTURE.modulesRoot).toBe("src/modules");
    expect(existsSync(join(root, APP_STRUCTURE.rootLayout))).toBe(true);
    expect(existsSync(join(root, APP_STRUCTURE.rootPage))).toBe(true);
    expect(existsSync(join(root, APP_STRUCTURE.forbiddenPagesRouterDir))).toBe(
      false,
    );
    expect(() => assertNoPagesRouterDirectory(false)).not.toThrow();
    expect(() => assertNoPagesRouterDirectory(true)).toThrow(/Pages Router/i);
  });

  it("sets lang=fa and dir=rtl on the root layout file", () => {
    const layout = readFileSync(
      join(process.cwd(), APP_STRUCTURE.rootLayout),
      "utf8",
    );
    expect(layout).toMatch(/lang=["']fa["']/);
    expect(layout).toMatch(/dir=["']rtl["']/);
  });

  it("keeps presentation calling application only", () => {
    expect(COMPOSITION_RULES.presentationCalls).toBe("application");
    expect(COMPOSITION_RULES.noBusinessRulesInPageFiles).toBe(true);
    expect(COMPOSITION_RULES.noDirectDbInGodComponents).toBe(true);
    expect(() => assertPresentationCallsApplication("application")).not.toThrow();
    expect(() => assertPresentationCallsApplication("infrastructure")).toThrow(
      /application layer/i,
    );
    expect(HOST_CROSS_CUTTING.secureCookiesInProd).toBe(true);
    expect(HOST_CROSS_CUTTING.correlationIdMiddleware).toBe(true);
  });
});
