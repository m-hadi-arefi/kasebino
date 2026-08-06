/**
 * ADR-114 / ADR-125 — shadcn primitive inventory (owned copies under src/components/ui).
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
  "dropdown-menu",
  "navigation-menu",
  "breadcrumb",
  "avatar",
  "separator",
  "scroll-area",
  "collapsible",
  "tooltip",
  "alert",
  "alert-dialog",
  "skeleton",
  "progress",
  "hover-card",
  "textarea",
  "switch",
  "radio-group",
  "popover",
  "command",
  "pagination",
  "drawer",
  "sidebar",
  "form",
] as const;

export type ShadcnMvpPrimitive = (typeof SHADCN_MVP_PRIMITIVES)[number];

export const SHADCN_MVP_PATHS = {
  uiDir: "src/components/ui",
  compositesDir: "src/components/composites",
  layoutDir: "src/components/layout",
  domainPos: "src/components/domain/pos",
  domainCrm: "src/components/domain/crm",
  domainStorefront: "src/components/domain/storefront",
  kitPage: "app/ui-kit/page.tsx",
} as const;

/** Iranian First composites (ADR-114) — must exist as .tsx */
export const COMPOSITE_BUILDING_BLOCKS = [
  "phone-keypad",
  "toman-display",
  "status-chip",
  "jalali-date-text",
] as const;

/** Shared app composites (ADR-125) */
export const APP_COMPOSITES = [
  "page-header",
  "section-header",
  "empty-state",
  "error-state",
  "loading-state",
  "stat-card",
  "confirm-dialog",
  "filter-bar",
  "search-input",
  "form-section",
] as const;
