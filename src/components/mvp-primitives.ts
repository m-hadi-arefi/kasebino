/**
 * ADR-114 — MVP shadcn primitive inventory (owned copies under src/components/ui).
 */

export const SHADCN_MVP_PRIMITIVES = [
  "button",
  "input",
  "label",
  "dialog",
  "sheet",
  "tabs",
  "table",
  "badge",
  "sonner",
  "select",
  "checkbox",
  "card",
] as const;

export type ShadcnMvpPrimitive = (typeof SHADCN_MVP_PRIMITIVES)[number];

export const SHADCN_MVP_PATHS = {
  uiDir: "src/components/ui",
  compositesDir: "src/components/composites",
  domainPos: "src/components/domain/pos",
  domainCrm: "src/components/domain/crm",
  domainStorefront: "src/components/domain/storefront",
  kitPage: "app/ui-kit/page.tsx",
} as const;

export const COMPOSITE_BUILDING_BLOCKS = [
  "phone-keypad",
  "toman-display",
  "status-chip",
  "jalali-date-text",
] as const;
