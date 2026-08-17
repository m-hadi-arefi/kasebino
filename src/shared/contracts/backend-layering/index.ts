/**
 * ADR-029 — Backend Clean Architecture Layering contract.
 * Routes/Server Actions → application use cases → domain ← infrastructure.
 *
 * Aligns with ADR-002 DDD_STRATEGY and ADR-016 COMPOSITION_RULES.
 */

import {
  DEPENDENCY_RULE,
  DOMAIN_FORBIDDEN_IMPORTS,
  DDD_STRATEGY,
} from "../../ddd/index.js";

/** Outermost → innermost (+ infrastructure adapters pointing inward). */
export const CLEAN_ARCHITECTURE_LAYERS = [
  "presentation",
  "application",
  "domain",
  "infrastructure",
] as const;

export type CleanArchitectureLayer =
  (typeof CLEAN_ARCHITECTURE_LAYERS)[number];

/**
 * Dependency direction (DIP). Same wording as ADR-002 DEPENDENCY_RULE.
 * Infrastructure depends on domain ports; domain never depends on infrastructure.
 */
export const DEPENDENCY_DIRECTION = DEPENDENCY_RULE;

/**
 * Where presentation lives in the Next.js host (ADR-016).
 * Module api/ui folders are also presentation surfaces when introduced.
 */
export const PRESENTATION_SURFACES = {
  appRouterPages: "app/**/page.tsx",
  routeHandlers: "app/**/route.ts",
  serverActions: "server_actions",
  moduleApi: "src/modules/*/api",
  moduleUi: "src/modules/*/ui",
} as const;

/** What each layer may call directly. */
export const LAYER_CALL_ALLOWLIST = {
  presentation: ["application"] as const,
  application: ["domain"] as const,
  /** Domain is pure; may only reference other domain types. */
  domain: ["domain"] as const,
  /** Adapters implement domain ports; may use frameworks/drivers. */
  infrastructure: ["domain"] as const,
} as const;

/**
 * Presentation must not bypass use cases for mutating work.
 * Reads that skip application still must not embed business invariants.
 */
export const PRESENTATION_FORBIDDEN = [
  "direct_domain_mutation",
  "direct_infrastructure_persistence",
  "direct_drizzle_access",
  "direct_mongodb_oltp",
  "business_invariants_in_handlers",
] as const;

/** Layer responsibilities (ADR-029 Technical / Domain / Security / Analytics impact). */
export const LAYER_RESPONSIBILITIES = {
  presentation: {
    role: "http_and_ui_adapters",
    calls: "application",
    humanMessages: "persian",
  },
  application: {
    role: "use_case_orchestration",
    ownsTransactionBoundaries: true,
    ownsAuthorization: true,
    emitsAnalyticsViaPorts: true,
  },
  domain: {
    role: "invariants_and_ubiquitous_language",
    language: "english",
    repositoryInterfacesOnly: true,
    forbiddenImports: DOMAIN_FORBIDDEN_IMPORTS,
  },
  infrastructure: {
    role: "adapters",
    implementsRepositories: true,
    drivers: [
      "drizzle_postgresql",
      "mongodb_analytics",
      "emqx",
      "minio",
      "sms",
    ] as const,
    sqlOrm: "drizzle" as const,
  },
} as const;

/**
 * Iranian First — presentation message strategy (ADR-029 UX Requirements).
 * Domain code stays English; user-visible strings are Persian at the edge.
 */
export const PRESENTATION_MESSAGE_STRATEGY = {
  humanReadableApiMessages: "persian",
  alternative: "stable_error_codes_with_persian_client_maps",
  domainUbiquitousLanguage: "english",
  authAndRateLimitErrors: "persian_user_safe",
  rtlForInternalJsonKeys: "n_a",
} as const;

/**
 * Request boundary hooks for later middleware / observability ADRs.
 * Propagate the same id across logs, outbox, warehouse, and audit.
 */
export const REQUEST_BOUNDARY = {
  correlationId: true,
  implementedBy: "deferred_middleware_adrs",
  propagatesTo: [
    "structured_logs",
    "outbox_events",
    "mongodb_warehouse",
    "audit_records",
    "traces",
  ] as const,
} as const;

/**
 * Composition root — wire infrastructure adapters into application use cases.
 * Module use cases live under `src/modules/<context>/application`.
 * Cross-cutting application helpers may use `src/shared/application`.
 */
export const COMPOSITION_ROOT = {
  host: "nextjs_app_router",
  moduleApplicationGlob: "src/modules/*/application",
  sharedApplicationSlot: "src/shared/application",
  rule: "Construct use cases with infrastructure adapters at the composition root; presentation receives application ports only.",
} as const;

export function assertDependencyDirection(rule: string): void {
  if (rule !== DEPENDENCY_DIRECTION) {
    throw new Error(
      `Clean Architecture dependency direction must be "${DEPENDENCY_DIRECTION}" (ADR-029); got "${rule}".`,
    );
  }
}

export function assertPresentationCallsApplicationOnly(
  layersCalledByPresentation: readonly string[],
): void {
  const allowed = LAYER_CALL_ALLOWLIST.presentation as readonly string[];
  for (const layer of layersCalledByPresentation) {
    if (!allowed.includes(layer)) {
      throw new Error(
        `Presentation may only call application (ADR-029); cannot call "${layer}". ` +
          `Forbidden: domain/infra mutation bypassing use cases.`,
      );
    }
  }
  if (
    layersCalledByPresentation.length === 0 ||
    !layersCalledByPresentation.every((l) => l === "application")
  ) {
    throw new Error(
      `Presentation must call the application layer only (ADR-029).`,
    );
  }
}

export function assertNoPresentationBypass(forbiddenPractice: string): void {
  if (
    (PRESENTATION_FORBIDDEN as readonly string[]).includes(forbiddenPractice)
  ) {
    throw new Error(
      `Presentation must not perform "${forbiddenPractice}" (ADR-029). ` +
        `Route Handlers and Server Actions call application use cases only.`,
    );
  }
}

export function assertDomainForbidsImport(packageName: string): void {
  if (
    !(DOMAIN_FORBIDDEN_IMPORTS as readonly string[]).includes(packageName)
  ) {
    throw new Error(
      `Domain does not list "${packageName}" as forbidden; expected alignment with ADR-002 DOMAIN_FORBIDDEN_IMPORTS.`,
    );
  }
}

export function assertRepositoryPlacement(placement: {
  interfacesIn: string;
  implementationsIn: string;
}): void {
  if (placement.interfacesIn !== DDD_STRATEGY.repositoryInterfacesIn) {
    throw new Error(
      `Repository interfaces must live in "${DDD_STRATEGY.repositoryInterfacesIn}" (ADR-029/002); got "${placement.interfacesIn}".`,
    );
  }
  if (
    placement.implementationsIn !== DDD_STRATEGY.repositoryImplementationsIn
  ) {
    throw new Error(
      `Repository implementations must live in "${DDD_STRATEGY.repositoryImplementationsIn}" (ADR-029/002); got "${placement.implementationsIn}".`,
    );
  }
}

export function assertUseCaseOwnsTransactionBoundary(
  ownsTransactionBoundaries: boolean,
): void {
  if (!ownsTransactionBoundaries) {
    throw new Error(
      `Application use cases own transaction boundaries (ADR-029).`,
    );
  }
}

export function assertAuthZInApplication(authZLayer: string): void {
  if (authZLayer !== "application") {
    throw new Error(
      `Authorization (AuthZ) is enforced at the application layer (ADR-029); got "${authZLayer}".`,
    );
  }
}

export function assertCorrelationIdOnRequestBoundary(
  boundary: { correlationId: boolean },
): void {
  if (!boundary.correlationId) {
    throw new Error(
      `Request boundary must carry correlationId (ADR-029; middleware ADRs implement propagation).`,
    );
  }
}

export function assertPersianPresentationMessages(strategy: {
  humanReadableApiMessages: string;
}): void {
  if (strategy.humanReadableApiMessages !== "persian") {
    throw new Error(
      `Human-readable presentation/API messages must be Persian (ADR-029 Iranian First); got "${strategy.humanReadableApiMessages}".`,
    );
  }
}

export const BACKEND_LAYERING = {
  layers: CLEAN_ARCHITECTURE_LAYERS,
  dependencyDirection: DEPENDENCY_DIRECTION,
  presentationSurfaces: PRESENTATION_SURFACES,
  layerCallAllowlist: LAYER_CALL_ALLOWLIST,
  presentationForbidden: PRESENTATION_FORBIDDEN,
  responsibilities: LAYER_RESPONSIBILITIES,
  presentationMessageStrategy: PRESENTATION_MESSAGE_STRATEGY,
  requestBoundary: REQUEST_BOUNDARY,
  compositionRoot: COMPOSITION_ROOT,
  alignsWithDdd: {
    domainForbiddenImports: DOMAIN_FORBIDDEN_IMPORTS,
    repositoryInterfacesIn: DDD_STRATEGY.repositoryInterfacesIn,
    repositoryImplementationsIn: DDD_STRATEGY.repositoryImplementationsIn,
    sqlOrm: DDD_STRATEGY.orm,
  },
} as const;
