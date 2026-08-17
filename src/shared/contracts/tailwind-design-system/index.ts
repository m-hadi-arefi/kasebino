/**
 * ADR-020 — Tailwind Design System Strategy contract.
 *
 * Utility-first styling via Tailwind v4 + CSS variable tokens.
 * Mobile-first; RTL logical properties; Iranian retail visual direction.
 */

import { APP_SHELL } from "../nextjs-architecture/index.js";
import { RTL_COMPONENT_RULES } from "../frontend-components/index.js";

/** Styling engine lock. */
export const TAILWIND_ENGINE = {
  name: "tailwindcss",
  major: 4 as const,
  cssFirst: true,
  postcssPlugin: "@tailwindcss/postcss",
  mobileFirst: true,
  utilityFirst: true,
} as const;

/** Filesystem + Next host wiring. */
export const TAILWIND_PATHS = {
  globalCss: "app/globals.css",
  postcssConfig: "postcss.config.mjs",
  /** Compatibility stub for shadcn components.json — theme lives in globals. */
  configStub: "tailwind.config.ts",
  layout: "app/layout.tsx",
  utils: "src/lib/utils.ts",
  contractDir: "src/shared/contracts/tailwind-design-system",
} as const;

/**
 * Token names required by docs/uiux/design-system.md.
 * Values live in `app/globals.css` `:root`.
 */
export const DESIGN_TOKEN_NAMES = [
  "--color-bg",
  "--color-surface",
  "--color-fg",
  "--color-muted",
  "--color-primary",
  "--color-primary-fg",
  "--color-success",
  "--color-warning",
  "--color-danger",
  "--color-border",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--shadow-sm",
  "--font-sans",
  "--font-display",
] as const;

export type DesignTokenName = (typeof DESIGN_TOKEN_NAMES)[number];

/** Visual direction — Iranian retail utility (docs/uiux/design-system.md). */
export const VISUAL_DIRECTION = {
  name: "modern-retail-utility",
  daylightFriendly: true,
  /** Ban default AI purple / cream-terracotta cliché palettes. */
  forbidPurpleDefaultAiAesthetic: true,
  forbidCreamTerracottaCliché: true,
  primaryHueFamily: "teal",
  docs: "docs/uiux/design-system.md",
} as const;

/** Persian typography stack. */
export const PERSIAN_TYPOGRAPHY = {
  primaryFont: "Vazirmatn",
  nextFontPackage: "next/font/google",
  cssVariable: "--font-vazirmatn",
  fontSansToken: "--font-sans",
  fontDisplayToken: "--font-display",
  minBodyPx: 16,
  forbidDefaultOnlyStacks: ["Inter", "Roboto", "Arial"] as const,
} as const;

/** RTL / logical CSS rules for all Tailwind/class usage. */
export const RTL_TOKEN_RULES = {
  dir: APP_SHELL.htmlDir,
  lang: APP_SHELL.htmlLang,
  logicalPropsMandatory: RTL_COMPONENT_RULES.logicalPropsMandatory,
  preferLogicalUtilities: [
    "ms-",
    "me-",
    "ps-",
    "pe-",
    "start-",
    "end-",
    "text-start",
    "text-end",
    "inset-inline",
    "margin-inline",
    "padding-inline",
  ] as const,
  forbidPhysicalSpine: true,
} as const;

/** Density modes — POS large targets vs analytical comfort. */
export const DENSITY_TOKENS = {
  posTapMinCssVar: "--density-pos-tap-min",
  posTapMinPx: 44,
  analyticalTapMinCssVar: "--density-analytical-tap-min",
} as const;

/** Accessibility baseline for token pairs. */
export const A11Y_TOKEN_RULES = {
  contrastTarget: "WCAG_AA" as const,
  primaryOnPrimaryFg: true,
  fgOnBg: true,
} as const;

/** Packages required with this ADR (ADR-019 deferred list now installed). */
export const TAILWIND_UTIL_PACKAGES = {
  cnUsesClsxAndTailwindMerge: true,
  packages: ["clsx", "tailwind-merge"] as const,
  enginePackages: ["tailwindcss", "@tailwindcss/postcss", "postcss"] as const,
} as const;

export const TAILWIND_DESIGN_SYSTEM = {
  engine: TAILWIND_ENGINE,
  paths: TAILWIND_PATHS,
  tokens: DESIGN_TOKEN_NAMES,
  visual: VISUAL_DIRECTION,
  typography: PERSIAN_TYPOGRAPHY,
  rtl: RTL_TOKEN_RULES,
  density: DENSITY_TOKENS,
  a11y: A11Y_TOKEN_RULES,
  utils: TAILWIND_UTIL_PACKAGES,
} as const;

export function assertDesignTokenPresent(
  cssSource: string,
  token: DesignTokenName,
): void {
  if (!cssSource.includes(token)) {
    throw new Error(
      `Design token "${token}" must be defined in ${TAILWIND_PATHS.globalCss} (ADR-020).`,
    );
  }
}

export function assertRtlLogicalUtilities(options: {
  logicalProps: boolean;
  rtl: boolean;
}): void {
  if (!options.rtl || !options.logicalProps) {
    throw new Error(
      "Tailwind usage must be RTL-first with logical CSS properties (ADR-020 Iranian First).",
    );
  }
}

const BANNED_PURPLE_PRIMARY_HEX = [
  "#7c3aed",
  "#8b5cf6",
  "#6366f1",
  "#a855f7",
  "#4f46e5",
] as const;

export function assertNotPurpleDefaultAesthetic(primaryHex: string): void {
  const hex = primaryHex.trim().toLowerCase();
  if ((BANNED_PURPLE_PRIMARY_HEX as readonly string[]).includes(hex)) {
    throw new Error(
      `Primary "${primaryHex}" matches banned purple-default AI aesthetic (ADR-020 / design-system.md).`,
    );
  }
}
