import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEPENDENCY_RULE,
  DOMAIN_FORBIDDEN_IMPORTS,
  DDD_STRATEGY,
} from "../../ddd/index.js";
import { COMPOSITION_RULES } from "../nextjs-architecture/index.js";
import {
  BACKEND_LAYERING,
  CLEAN_ARCHITECTURE_LAYERS,
  COMPOSITION_ROOT,
  DEPENDENCY_DIRECTION,
  LAYER_CALL_ALLOWLIST,
  LAYER_RESPONSIBILITIES,
  PRESENTATION_FORBIDDEN,
  PRESENTATION_MESSAGE_STRATEGY,
  PRESENTATION_SURFACES,
  REQUEST_BOUNDARY,
  assertAuthZInApplication,
  assertCorrelationIdOnRequestBoundary,
  assertDependencyDirection,
  assertDomainForbidsImport,
  assertNoPresentationBypass,
  assertPersianPresentationMessages,
  assertPresentationCallsApplicationOnly,
  assertRepositoryPlacement,
  assertUseCaseOwnsTransactionBoundary,
} from "./index.js";

describe("ADR-029 Backend Clean Architecture Layering", () => {
  it("defines Clean Architecture layers and inward dependency direction", () => {
    expect(CLEAN_ARCHITECTURE_LAYERS).toEqual([
      "presentation",
      "application",
      "domain",
      "infrastructure",
    ]);
    expect(DEPENDENCY_DIRECTION).toBe(DEPENDENCY_RULE);
    expect(DEPENDENCY_DIRECTION).toMatch(
      /presentation → application → domain ← infrastructure/,
    );
    expect(() => assertDependencyDirection(DEPENDENCY_DIRECTION)).not.toThrow();
    expect(() => assertDependencyDirection("fat controllers")).toThrow(
      /dependency direction/i,
    );
    expect(BACKEND_LAYERING.dependencyDirection).toBe(DEPENDENCY_DIRECTION);
  });

  it("restricts presentation to application only (no domain/infra bypass)", () => {
    expect(LAYER_CALL_ALLOWLIST.presentation).toEqual(["application"]);
    expect(COMPOSITION_RULES.presentationCalls).toBe("application");
    expect(PRESENTATION_SURFACES.routeHandlers).toContain("route.ts");
    expect(PRESENTATION_SURFACES.serverActions).toBe("server_actions");
    expect(PRESENTATION_FORBIDDEN).toEqual(
      expect.arrayContaining([
        "direct_domain_mutation",
        "direct_infrastructure_persistence",
        "direct_drizzle_access",
      ]),
    );
    expect(() =>
      assertPresentationCallsApplicationOnly(["application"]),
    ).not.toThrow();
    expect(() =>
      assertPresentationCallsApplicationOnly(["infrastructure"]),
    ).toThrow(/application/i);
    expect(() =>
      assertPresentationCallsApplicationOnly(["domain"]),
    ).toThrow(/application/i);
    expect(() => assertNoPresentationBypass("direct_domain_mutation")).toThrow(
      /direct_domain_mutation/i,
    );
  });

  it("aligns domain forbidden imports with ADR-002 DDD_STRATEGY", () => {
    expect(LAYER_RESPONSIBILITIES.domain.forbiddenImports).toEqual(
      DOMAIN_FORBIDDEN_IMPORTS,
    );
    expect(BACKEND_LAYERING.alignsWithDdd.domainForbiddenImports).toEqual(
      expect.arrayContaining(["drizzle-orm", "next", "react", "mongodb"]),
    );
    expect(() => assertDomainForbidsImport("drizzle-orm")).not.toThrow();
    expect(() => assertDomainForbidsImport("next")).not.toThrow();
    expect(() => assertDomainForbidsImport("react")).not.toThrow();
    expect(() => assertDomainForbidsImport("mongodb")).not.toThrow();
    expect(() => assertDomainForbidsImport("lodash")).toThrow(/forbidden/i);
  });

  it("places repository ports in domain and adapters in infrastructure", () => {
    expect(LAYER_RESPONSIBILITIES.domain.repositoryInterfacesOnly).toBe(true);
    expect(LAYER_RESPONSIBILITIES.infrastructure.implementsRepositories).toBe(
      true,
    );
    expect(LAYER_RESPONSIBILITIES.infrastructure.sqlOrm).toBe("drizzle");
    expect(LAYER_RESPONSIBILITIES.infrastructure.drivers).toEqual(
      expect.arrayContaining([
        "drizzle_postgresql",
        "mongodb_analytics",
        "emqx",
        "minio",
        "sms",
      ]),
    );
    expect(() =>
      assertRepositoryPlacement({
        interfacesIn: DDD_STRATEGY.repositoryInterfacesIn,
        implementationsIn: DDD_STRATEGY.repositoryImplementationsIn,
      }),
    ).not.toThrow();
    expect(() =>
      assertRepositoryPlacement({
        interfacesIn: "infrastructure",
        implementationsIn: "domain",
      }),
    ).toThrow(/interfaces must live in "domain"/i);
  });

  it("gives application AuthZ, TX boundaries, and analytics ports", () => {
    expect(LAYER_RESPONSIBILITIES.application.ownsAuthorization).toBe(true);
    expect(LAYER_RESPONSIBILITIES.application.ownsTransactionBoundaries).toBe(
      true,
    );
    expect(LAYER_RESPONSIBILITIES.application.emitsAnalyticsViaPorts).toBe(
      true,
    );
    expect(() => assertAuthZInApplication("application")).not.toThrow();
    expect(() => assertAuthZInApplication("presentation")).toThrow(/AuthZ/i);
    expect(() => assertUseCaseOwnsTransactionBoundary(true)).not.toThrow();
    expect(() => assertUseCaseOwnsTransactionBoundary(false)).toThrow(
      /transaction/i,
    );
  });

  it("notes correlationId on the request boundary for later middleware ADRs", () => {
    expect(REQUEST_BOUNDARY.correlationId).toBe(true);
    expect(REQUEST_BOUNDARY.implementedBy).toBe("deferred_middleware_adrs");
    expect(REQUEST_BOUNDARY.propagatesTo).toEqual(
      expect.arrayContaining([
        "structured_logs",
        "outbox_events",
        "mongodb_warehouse",
      ]),
    );
    expect(() =>
      assertCorrelationIdOnRequestBoundary(REQUEST_BOUNDARY),
    ).not.toThrow();
    expect(() =>
      assertCorrelationIdOnRequestBoundary({ correlationId: false }),
    ).toThrow(/correlationId/i);
  });

  it("locks Persian presentation messages and English domain language", () => {
    expect(PRESENTATION_MESSAGE_STRATEGY.humanReadableApiMessages).toBe(
      "persian",
    );
    expect(PRESENTATION_MESSAGE_STRATEGY.domainUbiquitousLanguage).toBe(
      "english",
    );
    expect(LAYER_RESPONSIBILITIES.presentation.humanMessages).toBe("persian");
    expect(LAYER_RESPONSIBILITIES.domain.language).toBe("english");
    expect(() =>
      assertPersianPresentationMessages(PRESENTATION_MESSAGE_STRATEGY),
    ).not.toThrow();
    expect(() =>
      assertPersianPresentationMessages({
        humanReadableApiMessages: "english",
      }),
    ).toThrow(/Persian/i);
  });

  it("documents composition root and shared application slot", () => {
    expect(COMPOSITION_ROOT.sharedApplicationSlot).toBe(
      "src/shared/application",
    );
    expect(COMPOSITION_ROOT.moduleApplicationGlob).toBe(
      "src/modules/*/application",
    );
    expect(
      existsSync(join(process.cwd(), "src", "shared", "application")),
    ).toBe(true);
    expect(BACKEND_LAYERING.compositionRoot.host).toBe("nextjs_app_router");
  });
});
