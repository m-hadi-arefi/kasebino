/**
 * ADR-019 — shadcn/ui Strategy contract.
 *
 * shadcn/ui is the exclusive accessible primitive vendor: CLI-generated,
 * owned source under `src/components/ui` (ADR-018 path). Customize via
 * design tokens (ADR-020 Tailwind) — do not invent a parallel design system.
 */

import {
  COMPONENT_PATHS,
  IRANIAN_ADAPTER_REQUIREMENTS,
  RTL_COMPONENT_RULES,
} from "../frontend-components/index.js";

/** Exclusive primitive vendor — owned copy, not a black-box npm design system. */
export const SHADCN_VENDOR = {
  name: "shadcn/ui",
  sourceModel: "owned-copy" as const,
  runtimeNpmPackageForbidden: true,
  radixPrimitives: true,
  accessibilityFocusManagementRequired: true,
  cliGenerate: true,
  customizeViaTokens: true,
  tokensAdr: "ADR-020",
} as const;

/**
 * Filesystem + CLI targets.
 * ADR text historically said `src/shared/ui`; ADR-018 superseded that with
 * `src/components/ui` — always generate here.
 */
export const SHADCN_PATHS = {
  componentsJson: "components.json",
  primitivesDir: COMPONENT_PATHS.primitives,
  utils: "src/lib/utils.ts",
  utilsAlias: "@/lib/utils",
  componentsAlias: "@/components",
  uiAlias: "@/components/ui",
  legacySharedUi: COMPONENT_PATHS.legacySharedUi,
  /** Landed by ADR-020. */
  tailwindConfig: "tailwind.config.ts",
  globalCss: "app/globals.css",
} as const;

/** Root `components.json` stub shape (shadcn CLI). */
export const COMPONENTS_JSON_CONTRACT = {
  style: "new-york",
  rsc: true,
  tsx: true,
  rtl: true,
  aliases: {
    components: SHADCN_PATHS.componentsAlias,
    utils: SHADCN_PATHS.utilsAlias,
    ui: SHADCN_PATHS.uiAlias,
    lib: "@/lib",
    hooks: "@/hooks",
  },
  tailwind: {
    config: SHADCN_PATHS.tailwindConfig,
    css: SHADCN_PATHS.globalCss,
    baseColor: "neutral",
    cssVariables: true,
  },
} as const;

/**
 * Forbidden parallel design systems / component libraries.
 * Never add these as the primitive layer.
 */
export const FORBIDDEN_PARALLEL_DESIGN_SYSTEMS = [
  "@mui/material",
  "@mui/core",
  "@chakra-ui/react",
  "antd",
  "@mantine/core",
  "@nextui-org/react",
  "react-bootstrap",
  "@fluentui/react",
  "semantic-ui-react",
] as const;

export type ForbiddenParallelDesignSystem =
  (typeof FORBIDDEN_PARALLEL_DESIGN_SYSTEMS)[number];

/**
 * Class / variant helpers for shadcn primitives.
 * `clsx` + `tailwind-merge` land with ADR-020; `cva` when Button variants ship.
 */
export const SHADCN_UTIL_PACKAGES = {
  deferredUntilTailwindAdr: false,
  packages: [
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
  ] as const,
  stubProvidesCnWithoutDeps: false,
  cnUsesClsxAndTailwindMerge: true,
  classVarianceAuthorityDeferredUntilPrimitiveGenerate: true,
} as const;

/** Iranian First / RTL rules for every generated primitive. */
export const SHADCN_RTL_RULES = {
  ...RTL_COMPONENT_RULES,
  rtlConfiguredInComponentsJson: true,
  logicalPropsMandatory: true,
  persianTypographyNoClip: true,
  mirrorDirectionalIcons: true,
  keepRadixFocusManagement: true,
} as const;

/** No Western-only date/currency subcomponents without Iranian adapters. */
export const SHADCN_IRANIAN_RULES = {
  ...IRANIAN_ADAPTER_REQUIREMENTS,
  forbidWesternOnlyDateCurrencySubcomponents: true,
} as const;

/**
 * Generation / ownership rules.
 * Tokens are available (ADR-020); CLI visual primitives follow ADR-021 process.
 */
export const SHADCN_GENERATION_RULES = {
  generateInto: SHADCN_PATHS.primitivesDir,
  forbidGenerateIntoLegacySharedUi: true,
  wrapForDomainInCompositesOrDomain: true,
  noHeavyForkWithoutNeed: true,
  tokensAvailableFrom: "ADR-020",
  primitivesVisualDeferredTo: "ADR-021+",
  treeShakePerComponentImport: true,
} as const;

export function isForbiddenParallelDesignSystem(pkg: string): boolean {
  return (FORBIDDEN_PARALLEL_DESIGN_SYSTEMS as readonly string[]).includes(pkg);
}

export function assertPrimitiveInstallPath(path: string): void {
  const normalized = path.replace(/\\/g, "/");
  if (normalized === SHADCN_PATHS.legacySharedUi ||
      normalized.startsWith(`${SHADCN_PATHS.legacySharedUi}/`)) {
    throw new Error(
      `Legacy path "${path}" is superseded (ADR-018/019); generate shadcn into "${SHADCN_PATHS.primitivesDir}".`,
    );
  }
  if (
    normalized !== SHADCN_PATHS.primitivesDir &&
    !normalized.startsWith(`${SHADCN_PATHS.primitivesDir}/`)
  ) {
    throw new Error(
      `shadcn primitives must live under "${SHADCN_PATHS.primitivesDir}" (ADR-019); got "${path}".`,
    );
  }
}

export function assertNotParallelDesignSystem(pkg: string): void {
  if (isForbiddenParallelDesignSystem(pkg)) {
    throw new Error(
      `Parallel design system "${pkg}" is forbidden (ADR-019); use shadcn/ui owned copies in ${SHADCN_PATHS.primitivesDir}.`,
    );
  }
}

export function assertShadcnRtlCompatible(options: {
  logicalProps: boolean;
  rtl: boolean;
}): void {
  if (!options.rtl || !options.logicalProps) {
    throw new Error(
      "shadcn primitives must be RTL-first with logical CSS properties (ADR-019 Iranian First).",
    );
  }
}

export const SHADCN_STRATEGY = {
  vendor: SHADCN_VENDOR,
  paths: SHADCN_PATHS,
  componentsJson: COMPONENTS_JSON_CONTRACT,
  forbiddenParallel: FORBIDDEN_PARALLEL_DESIGN_SYSTEMS,
  utilPackages: SHADCN_UTIL_PACKAGES,
  rtl: SHADCN_RTL_RULES,
  iranian: SHADCN_IRANIAN_RULES,
  generation: SHADCN_GENERATION_RULES,
} as const;
