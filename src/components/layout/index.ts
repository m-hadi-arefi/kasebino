/**
 * Layout module barrel (ADR-125).
 * React shells live in sibling `*.tsx` — import those via `@/components/layout/...`
 * (contracts typecheck is `.ts`-only and must not pull `.tsx`).
 */

export {
  ADMIN_NAV,
  MERCHANT_BOTTOM_NAV,
  MERCHANT_NAV,
  isNavActive,
  type AppNavItem,
} from "./nav-config.js";

export const LAYOUT_REACT_MODULES = [
  "app-shell",
  "app-bottom-nav",
  "app-sidebar-nav",
  "app-topbar",
  "storefront-chrome",
  "storefront-chrome-from-slug",
] as const;
