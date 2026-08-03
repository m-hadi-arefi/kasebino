/**
 * ADR-018 — Frontend Component Architecture contract.
 * Layered UI ownership: primitives → composites → domain.
 * No business logic / DB / domain imports in presentational primitives.
 * RTL-first logical props; Persian string capacity. Visual primitives land in ADR-019.
 */

import { COMPOSITION_RULES } from "../nextjs-architecture/index.js";
import { APP_SHELL_LOCALIZATION } from "../modular-monolith/index.js";

/** Architectural layers (inner → outer presentation). */
export const COMPONENT_LAYERS = {
  primitives: "primitives",
  composites: "composites",
  domain: "domain",
} as const;

export type ComponentLayer =
  (typeof COMPONENT_LAYERS)[keyof typeof COMPONENT_LAYERS];

/**
 * Filesystem roots under the Next.js host.
 * Primitives folder is reserved for ADR-019 shadcn; leave empty until then.
 */
export const COMPONENT_PATHS = {
  root: "src/components",
  /** Shared UI primitives (shadcn wrappers) — populated by ADR-019. */
  primitives: "src/components/ui",
  /** Cross-cutting compositions without domain aggregates. */
  composites: "src/components/composites",
  /** Domain composition folders (presentational shells). */
  domain: "src/components/domain",
  /** Module-owned UI compositions (ADR-004 / ADR-016). */
  moduleUiGlob: "src/modules/*/ui",
  /** Legacy path superseded by `primitives` (do not create). */
  legacySharedUi: "src/shared/ui",
} as const;

/**
 * Domain component folders aligned with docs/uiux/component-library.md.
 * Empty shells only in ADR-018; concrete components ship with owning ADRs.
 */
export const DOMAIN_COMPONENT_FOLDERS = [
  "pos",
  "crm",
  "loyalty",
  "catalog",
  "storefront",
  "ordering",
  "analytics",
  "admin",
  "identity",
] as const;

export type DomainComponentFolder =
  (typeof DOMAIN_COMPONENT_FOLDERS)[number];

/** MVP must not reserve delivery/courier UI folders (ADR-015 / ADR-082). */
export const FORBIDDEN_DOMAIN_COMPONENT_FOLDERS = [
  "delivery",
  "courier",
  "shipping",
] as const;

/**
 * Presentational rules — DDD-friendly UI (ADR-018 Decision).
 * Client/presentational components must not import domain aggregates or infra.
 */
export const PRESENTATIONAL_RULES = {
  noBusinessLogic: true,
  noDomainImportsInPrimitives: true,
  noDirectDbAccess: true,
  noOrmInUi: true,
  noSecretsInClientBundles: true,
  presentationCalls: COMPOSITION_RULES.presentationCalls,
  /** Server Components default; 'use client' only when interactivity requires. */
  clientComponentsMinimal: true,
  /** Domain CTAs should emit FeatureUsed via application/analytics plane — never embed secrets/SDKs in primitives. */
  featureUsedOnKeyCtasViaApplication: true,
} as const;

/** Import path segments forbidden inside presentational primitives. */
export const FORBIDDEN_PRESENTATIONAL_IMPORT_SEGMENTS = [
  "/domain/",
  "/infrastructure/",
  "/application/",
  "drizzle-orm",
  "@merchantos/infrastructure/database",
  "node:fs",
  "node:path",
] as const;

/**
 * Iranian First / RTL conventions for every component layer.
 * Physical left/right CSS must not form the layout spine.
 */
export const RTL_COMPONENT_RULES = {
  dir: "rtl" as const,
  lang: "fa" as const,
  locale: APP_SHELL_LOCALIZATION.locale,
  logicalPropsMandatory: true,
  persianTypographyNoClip: true,
  requiredLogicalCssProps: [
    "margin-inline",
    "padding-inline",
    "inset-inline",
    "border-inline",
    "text-align: start|end",
  ] as const,
  forbiddenPhysicalCssSpine: [
    "margin-left",
    "margin-right",
    "padding-left",
    "padding-right",
    "left",
    "right",
  ] as const,
  mirrorDirectionalIcons: true,
} as const;

/** Touch / layout density — POS vs analytical merchant screens. */
export const DENSITY_VARIANTS = {
  pos: {
    id: "pos",
    minTouchTargetPx: 44,
    note: "Large targets for Iranian POS handsets",
  },
  analytical: {
    id: "analytical",
    minTouchTargetPx: 44,
    note: "Comfortable density for dashboards",
  },
} as const;

export type DensityVariantId = keyof typeof DENSITY_VARIANTS;

/** Iranian business adapters required when date/money UI is introduced. */
export const IRANIAN_ADAPTER_REQUIREMENTS = {
  jalaliDatesForUserFacing: true,
  tomanCurrencyDisplay: true,
  forbidWesternOnlyDateCurrencySubcomponents: true,
} as const;

export function domainComponentPath(
  folder: DomainComponentFolder,
): string {
  return `${COMPONENT_PATHS.domain}/${folder}`;
}

export function isDomainComponentFolder(
  name: string,
): name is DomainComponentFolder {
  return (DOMAIN_COMPONENT_FOLDERS as readonly string[]).includes(name);
}

export function isForbiddenDomainComponentFolder(name: string): boolean {
  return (FORBIDDEN_DOMAIN_COMPONENT_FOLDERS as readonly string[]).includes(
    name,
  );
}

export function assertComponentLayer(layer: string): asserts layer is ComponentLayer {
  const allowed = Object.values(COMPONENT_LAYERS) as string[];
  if (!allowed.includes(layer)) {
    throw new Error(
      `Unknown component layer "${layer}" (ADR-018); expected one of: ${allowed.join(", ")}.`,
    );
  }
}

export function assertDomainComponentFolder(name: string): void {
  if (isForbiddenDomainComponentFolder(name)) {
    throw new Error(
      `Domain component folder "${name}" is forbidden in MVP (ADR-018 / ADR-015). Pickup-only; no delivery UI.`,
    );
  }
  if (!isDomainComponentFolder(name)) {
    throw new Error(
      `Unknown domain component folder "${name}" (ADR-018); expected one of: ${DOMAIN_COMPONENT_FOLDERS.join(", ")}.`,
    );
  }
}

export function assertNoBusinessLogicInPresentational(
  hasBusinessLogic: boolean,
): void {
  if (hasBusinessLogic) {
    throw new Error(
      "Presentational components must not contain business logic (ADR-018). Call application layer from containers/pages.",
    );
  }
}

export function assertNoDomainImportInPrimitive(
  importPath: string,
): void {
  for (const segment of FORBIDDEN_PRESENTATIONAL_IMPORT_SEGMENTS) {
    if (importPath.includes(segment)) {
      throw new Error(
        `Primitive/presentational UI must not import "${segment}" (ADR-018); got "${importPath}".`,
      );
    }
  }
}

export function assertLogicalCssProp(propName: string): void {
  const physical = RTL_COMPONENT_RULES.forbiddenPhysicalCssSpine as readonly string[];
  const normalized = propName.trim().toLowerCase();
  if (physical.includes(normalized)) {
    throw new Error(
      `Physical CSS prop "${propName}" is forbidden as layout spine (ADR-018 Iranian First RTL); use logical properties.`,
    );
  }
}

export function assertDensityVariant(id: string): asserts id is DensityVariantId {
  if (!(id in DENSITY_VARIANTS)) {
    throw new Error(
      `Unknown density variant "${id}" (ADR-018); expected "pos" or "analytical".`,
    );
  }
}

export const FRONTEND_COMPONENTS = {
  layers: COMPONENT_LAYERS,
  paths: COMPONENT_PATHS,
  domainFolders: DOMAIN_COMPONENT_FOLDERS,
  forbiddenDomainFolders: FORBIDDEN_DOMAIN_COMPONENT_FOLDERS,
  presentational: PRESENTATIONAL_RULES,
  rtl: RTL_COMPONENT_RULES,
  density: DENSITY_VARIANTS,
  iranianAdapters: IRANIAN_ADAPTER_REQUIREMENTS,
} as const;
