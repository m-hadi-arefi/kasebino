/**
 * ADR-002 — Domain-Driven Design strategy contract.
 * Folder layout per docs/architecture/14-ddd-architecture.md.
 */

export const DDD_MODULE_PATH_PATTERN =
  "src/modules/<context>/{domain,application,infrastructure}" as const;

/** Tactical layers inside each bounded-context module (inward → outward). */
export const MODULE_LAYERS = [
  "domain",
  "application",
  "infrastructure",
] as const;

export type ModuleLayer = (typeof MODULE_LAYERS)[number];

/**
 * Allowed domain subfolders (interfaces for repositories live under domain).
 * Presentation (api/ui) may exist later; never owns invariants.
 */
export const DOMAIN_SUBFOLDERS = [
  "aggregates",
  "entities",
  "value-objects",
  "events",
  "services",
  "repositories",
] as const;

export const APPLICATION_SUBFOLDERS = ["use-cases", "dto", "ports"] as const;

export const INFRASTRUCTURE_SUBFOLDERS = [
  "persistence",
  "messaging",
  "cache",
] as const;

/** Packages that must never be imported from domain code. */
export const DOMAIN_FORBIDDEN_IMPORTS = [
  "drizzle-orm",
  "next",
  "react",
  "react-dom",
  "mongodb",
] as const;

/**
 * Phase-1 module folders (refined by ADR-003 context map).
 * Aligned with docs/architecture/01-system-overview.md + customer-identity split.
 */
export const BOUNDED_CONTEXT_MODULES = [
  "identity",
  "customer-identity",
  "merchant",
  "store",
  "catalog",
  "inventory",
  "pos",
  "crm",
  "loyalty",
  "ordering",
  "payments",
  "analytics",
  "audit",
  "notifications",
  "realtime",
  "admin",
  "platform",
] as const;

export type BoundedContextModule = (typeof BOUNDED_CONTEXT_MODULES)[number];

export const DEPENDENCY_RULE =
  "Dependencies point inward only: presentation → application → domain ← infrastructure" as const;

export type DomainEventBase = {
  /** Past-tense ubiquitous-language name, e.g. SaleCompleted. */
  eventName: string;
  occurredAt: Date;
  aggregateId: string;
  aggregateType: string;
};

const COMMAND_LIKE_PREFIX =
  /^(Create|Update|Delete|Get|Set|Send|Fetch|Save|Upsert|Handle)/;

export function isPastTenseDomainEventName(eventName: string): boolean {
  if (!/^[A-Z][A-Za-z0-9]+$/.test(eventName)) {
    return false;
  }
  if (COMMAND_LIKE_PREFIX.test(eventName)) {
    return false;
  }
  return (
    /(?:ed|Created|Updated|Completed|Canceled|Cancelled|LoggedIn|LoggedOut|Generated|Activated|Suspended|Joined|Captured|Visited|Returned|Invalidated|Placed|Paid|Refunded|Preparing|ReadyForPickup|PickedUp|Shown|Sent)$/.test(
      eventName,
    ) || /[a-z]{2,}ed$/.test(eventName)
  );
}

export function assertPastTenseDomainEventName(eventName: string): void {
  if (!isPastTenseDomainEventName(eventName)) {
    throw new Error(
      `Domain event "${eventName}" must be past tense PascalCase (ADR-002). Example: SaleCompleted.`,
    );
  }
}

export function createDomainEvent<TPayload>(input: {
  eventName: string;
  aggregateId: string;
  aggregateType: string;
  payload: TPayload;
  occurredAt?: Date;
}): DomainEventBase & { payload: TPayload } {
  assertPastTenseDomainEventName(input.eventName);
  return {
    eventName: input.eventName,
    aggregateId: input.aggregateId,
    aggregateType: input.aggregateType,
    occurredAt: input.occurredAt ?? new Date(),
    payload: input.payload,
  };
}

/** Collect domain events on an aggregate root without framework deps. */
export type EventCollector = {
  record(event: DomainEventBase): void;
  pullEvents(): DomainEventBase[];
};

export function createEventCollector(): EventCollector {
  const events: DomainEventBase[] = [];
  return {
    record(event) {
      assertPastTenseDomainEventName(event.eventName);
      events.push(event);
    },
    pullEvents() {
      return events.splice(0, events.length);
    },
  };
}

export const DDD_STRATEGY = {
  pathPattern: DDD_MODULE_PATH_PATTERN,
  moduleLayers: MODULE_LAYERS,
  domainSubfolders: DOMAIN_SUBFOLDERS,
  applicationSubfolders: APPLICATION_SUBFOLDERS,
  infrastructureSubfolders: INFRASTRUCTURE_SUBFOLDERS,
  domainForbiddenImports: DOMAIN_FORBIDDEN_IMPORTS,
  boundedContextModules: BOUNDED_CONTEXT_MODULES,
  dependencyRule: DEPENDENCY_RULE,
  repositoryInterfacesIn: "domain",
  repositoryImplementationsIn: "infrastructure",
  orm: "drizzle",
} as const;
