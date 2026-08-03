/**
 * ADR-004 — Modular Monolith Strategy contract.
 * Phase 1: single Next.js deployable with module boundaries + outbox spine.
 * Extraction guidance: docs/architecture/20-future-microservice-extraction.md
 */

import { LOCALE_DEFAULTS } from "../product-architecture/index.js";
import { BOUNDED_CONTEXT_MODULES } from "../shared/ddd/index.js";

/** Phase-1 deploy topology (ADR-004 Decision). */
export const DEPLOYMENT_MODEL = "modular_monolith" as const;

export const DEPLOYABLE = {
  name: "merchantos-app",
  runtime: "nextjs",
  processModel: "stateless_node",
  /** Workers (outbox, projections) share this codebase — not separate microservices. */
  workersShareCodebase: true,
  unitOfDeploy: "whole_app",
} as const;

/** Where bounded-context modules live inside the monolith. */
export const MODULE_ROOT = "src/modules" as const;

export const MONOLITH_MODULES = BOUNDED_CONTEXT_MODULES;

export type MonolithModule = (typeof MONOLITH_MODULES)[number];

/**
 * Module communication rules for Phase 1.
 * Domain services must not join tables owned by other modules.
 */
export const MODULE_BOUNDARY_RULES = {
  noCrossModuleDbJoinsInDomain: true,
  compositionLayer: "application",
  publishedLanguage: "domain_events",
  integrationSpine: "transactional_outbox",
  /** Prefer ports/adapters for SMS, PSP, storage, MQTT. */
  externalSystemsViaPorts: true,
} as const;

/**
 * One outbox feeds many consumers (EMQX, Mongo warehouse, cache invalidation, notifications).
 * Analytics consumers must not sit on the checkout critical path.
 * Full event-driven contract: `src/event-driven` (ADR-036); worker poll → `src/outbox` (ADR-035).
 */
export const OUTBOX_SPINE = {
  pattern: "transactional_outbox",
  feeds: ["emqx_realtime", "mongodb_warehouse", "cache_invalidation", "notifications"] as const,
  analyticsOnCheckoutCriticalPath: false,
} as const;

/** Shared cross-cutting slots at the composition root (app shell). */
export const SHARED_MIDDLEWARE = [
  "security",
  "tenant_isolation",
  "rate_limit",
  "request_id",
  "persian_i18n",
  "rtl_layout",
] as const;

/**
 * Iranian First shell strategy — applied once for all modules (ADR-004 UX requirements).
 * Concrete Next.js providers land with ADR-016; contract locks defaults now.
 */
export const APP_SHELL_LOCALIZATION = {
  strategy: "shared_app_shell",
  language: LOCALE_DEFAULTS.language,
  locale: LOCALE_DEFAULTS.locale,
  dir: LOCALE_DEFAULTS.dir,
  calendar: LOCALE_DEFAULTS.calendar,
  moneyDisplayUnit: LOCALE_DEFAULTS.moneyDisplayUnit,
  rule: "Module UIs and API human messages share Persian i18n + RTL providers at app shell.",
} as const;

/** Forbidden until extraction criteria in doc 20 / ADR-071+ are met. */
export const FORBIDDEN_UNTIL_EXTRACTION = [
  "premature_multi_repo_split",
  "distributed_2pc",
  "shared_drizzle_across_deployables",
  "delivery_module",
] as const;

/** Likely extraction order from docs/architecture/20-future-microservice-extraction.md */
export const EXTRACTION_ORDER = [
  "realtime_gateway",
  "loyalty_engine",
  "analytics_projections",
  "notifications_sms",
  "catalog_storefront_read_api",
] as const;

export function isMonolithModule(name: string): name is MonolithModule {
  return (MONOLITH_MODULES as readonly string[]).includes(name);
}

export function assertNoDeliveryModule(modules: readonly string[]): void {
  if (modules.includes("delivery")) {
    throw new Error(
      "delivery module is forbidden in the modular monolith (ADR-004 / ADR-015).",
    );
  }
}

export function assertDomainMayNotJoinModules(
  owningModule: string,
  joinedModule: string,
): void {
  if (owningModule !== joinedModule) {
    throw new Error(
      `Domain services in "${owningModule}" must not join "${joinedModule}" tables ` +
        `(ADR-004: no cross-module DB joins in domain; compose in application / events).`,
    );
  }
}

export function assertWorkersShareCodebase(): void {
  if (!DEPLOYABLE.workersShareCodebase) {
    throw new Error(
      "Phase 1 workers must share the monolith codebase (ADR-004).",
    );
  }
}

export const MODULAR_MONOLITH = {
  deploymentModel: DEPLOYMENT_MODEL,
  deployable: DEPLOYABLE,
  moduleRoot: MODULE_ROOT,
  modules: MONOLITH_MODULES,
  boundaries: MODULE_BOUNDARY_RULES,
  outbox: OUTBOX_SPINE,
  sharedMiddleware: SHARED_MIDDLEWARE,
  appShellLocalization: APP_SHELL_LOCALIZATION,
  forbiddenUntilExtraction: FORBIDDEN_UNTIL_EXTRACTION,
  extractionOrder: EXTRACTION_ORDER,
} as const;
