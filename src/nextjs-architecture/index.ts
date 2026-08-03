/**
 * ADR-016 — Next.js Application Architecture contract.
 * App Router hosts UI, Route Handlers, and Server Actions in the modular monolith.
 */

import { APP_SHELL_LOCALIZATION, DEPLOYABLE } from "../modular-monolith/index.js";
import { LOCALE_DEFAULTS } from "../product-architecture/index.js";

/** Only App Router is permitted (ADR-016 / docs/rules/nextjs-rules.md). */
export const ROUTER = "app_router" as const;

export const FORBIDDEN_ROUTERS = ["pages_router"] as const;

/**
 * Rendering & API surface model for the Next.js host.
 * Server Components are default; client components are opt-in.
 */
export const RENDERING_MODEL = {
  default: "server_components",
  clientDirective: "use client",
  clientComponentsMinimal: true,
  routeHandlers: "public_json",
  serverActions: "authed_ui_mutations",
} as const;

/** Folder conventions aligned with docs/tech/nextjs.md and ADR-004 module root. */
export const APP_STRUCTURE = {
  routesRoot: "app",
  modulesRoot: "src/modules",
  moduleApiGlob: "src/modules/*/api",
  moduleUiGlob: "src/modules/*/ui",
  /** Layered shared UI roots (ADR-018); primitives filled by ADR-019. */
  componentsRoot: "src/components",
  componentsUi: "src/components/ui",
  middlewareFile: "middleware.ts",
  /** Must never be created — Pages Router is forbidden. */
  forbiddenPagesRouterDir: "pages",
  rootLayout: "app/layout.tsx",
  /** Marketing home (ADR-017 route group). */
  rootPage: "app/(marketing)/page.tsx",
} as const;

/**
 * Iranian First shell — html/body defaults prevent English-only LTR flash.
 * Concrete values must match ADR-001 / ADR-004 app-shell localization.
 */
export const APP_SHELL = {
  htmlLang: LOCALE_DEFAULTS.language,
  htmlDir: LOCALE_DEFAULTS.dir,
  locale: LOCALE_DEFAULTS.locale,
  layoutFile: APP_STRUCTURE.rootLayout,
  strategy: APP_SHELL_LOCALIZATION.strategy,
  rule: "Root layout must set lang=fa and dir=rtl for merchant/customer apps.",
} as const;

/** Presentation layer boundaries (ADR-016 Domain Impact). */
export const COMPOSITION_RULES = {
  presentationCalls: "application",
  noBusinessRulesInPageFiles: true,
  noDirectDbInGodComponents: true,
  hostRuntime: DEPLOYABLE.runtime,
} as const;

/** Security / analytics hooks noted by ADR-016 (implementation follows middleware ADRs). */
export const HOST_CROSS_CUTTING = {
  secureCookiesInProd: true,
  correlationIdMiddleware: true,
} as const;

export function assertAppRouterOnly(router: string): void {
  if (router !== ROUTER) {
    throw new Error(
      `Only App Router is allowed (ADR-016); got "${router}". Pages Router is forbidden.`,
    );
  }
}

export function assertAppShellFaRtl(attrs: {
  lang: string;
  dir: string;
}): void {
  if (attrs.lang !== APP_SHELL.htmlLang || attrs.dir !== APP_SHELL.htmlDir) {
    throw new Error(
      `App shell must default lang="${APP_SHELL.htmlLang}" dir="${APP_SHELL.htmlDir}" ` +
        `(ADR-016 Iranian First); got lang="${attrs.lang}" dir="${attrs.dir}".`,
    );
  }
}

export function assertNoPagesRouterDirectory(pagesDirExists: boolean): void {
  if (pagesDirExists) {
    throw new Error(
      `Pages Router directory "${APP_STRUCTURE.forbiddenPagesRouterDir}/" is forbidden (ADR-016).`,
    );
  }
}

export function assertPresentationCallsApplication(
  layerCalledByPresentation: string,
): void {
  if (layerCalledByPresentation !== COMPOSITION_RULES.presentationCalls) {
    throw new Error(
      `Presentation may only call the application layer (ADR-016); ` +
        `got "${layerCalledByPresentation}".`,
    );
  }
}

export const NEXTJS_ARCHITECTURE = {
  router: ROUTER,
  forbiddenRouters: FORBIDDEN_ROUTERS,
  rendering: RENDERING_MODEL,
  structure: APP_STRUCTURE,
  appShell: APP_SHELL,
  composition: COMPOSITION_RULES,
  crossCutting: HOST_CROSS_CUTTING,
} as const;
