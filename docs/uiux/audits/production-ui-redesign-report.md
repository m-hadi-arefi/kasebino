# Production UI Redesign Report (ADR-125)

**Date:** 2026-08-06  
**Scope:** Full frontend — merchant, admin, storefront, marketing, ui-kit  
**Brand:** MerchantOS Iranian retail utility (teal daylight, Vazirmatn, RTL) — polish inspired by Stripe/Vercel/Clerk quality, not branding.

## Verdict

The frontend now uses a shared shadcn-based design system with persistent app shells (desktop sidebar + mobile bottom nav), reusable composites, and migrated product pages. Playwright public-route audits pass at mobile/tablet/desktop. Authenticated merchant and seeded storefront routes remain optional (env fixtures).

## Pages completed

### Merchant (`app/(merchant)/`)
- `/login`, `/onboarding`
- `/dashboard` (debug session card removed; StatCard overview)
- `/products`, `/products/new`, `/products/[id]`
- `/inventory`, `/customers`, `/customers/[id]`
- `/loyalty`, `/orders`, `/notifications`
- `/stores`, `/stores/new`, `/stores/[id]/location`, `/stores/[id]/qr`
- `/pos` (PosChrome denser shell)

### Admin (`app/(admin)/`)
- `/admin`, `/admin/merchants`, `/admin/security`, `/admin/audit`

### Storefront (`app/(storefront)/`)
- Home, about, catalog, product detail, checkout, login
- Portal: dashboard, orders, wallet, rewards, receipts, notifications
- Wrapped with `StorefrontChrome` / `StorefrontChromeFromSlug`

### Marketing & kit
- `/` landing (token-aligned; hero brand-first retained)
- `/ui-kit` expanded showcase

## Components created

### Layout (`src/components/layout/`)
- `AppShell`, `PosChrome`, `AppSidebarNav`, `AppBottomNav`, `AppTopbar`
- `StorefrontChrome`, `StorefrontChromeFromSlug`
- `nav-config` (merchant/admin nav + active matching)

### Composites (`src/components/composites/`)
- `PageHeader`, `SectionHeader`, `StatCard`
- `EmptyState`, `ErrorState`, `LoadingState`
- `ConfirmDialog` / `DeleteDialog`
- `FilterBar`, `SearchInput`, `FormSection` / `SettingsSection`

### shadcn primitives added (ADR-114 inventory expanded)
dropdown-menu, navigation-menu, breadcrumb, avatar, separator, scroll-area, collapsible, tooltip, alert, alert-dialog, skeleton, progress, hover-card, textarea, switch, radio-group, popover, command, pagination, drawer, sidebar, form

## Migrated to shadcn

Native HTML controls on product pages were replaced with Button, Input, Label, Select, Card, Badge, Tabs, Table, Alert, Dialog/AlertDialog, Sheet, Checkbox, Skeleton, Sonner, etc. Lists use Empty/Loading/Error states. Confirmations use AlertDialog instead of `window.confirm` where updated.

## Playwright audit

- Config: `playwright.config.ts` (system Chrome channel — CDN Chromium geo-blocked)
- Spec: `e2e/ui-audit.spec.ts`
- Scripts: `npm run test:e2e`, `npm run test:e2e:ui`
- **Result:** 21 passed, 15 skipped (need `E2E_STORE_SLUG` / `E2E_STORAGE_STATE`)
- Screenshots: [`docs/uiux/audits/2026-08-06/after/`](./2026-08-06/after/)

### After screenshots (public)
- marketing / merchant-login / ui-kit / admin-hub / admin-merchants / admin-security / admin-audit × mobile · tablet · desktop

### Before screenshots
Not captured as a separate tree before migration (continuous pass). Treat prior MVP hub-and-spoke as the baseline; after/ set is the production shell evidence.

## Remaining technical debt

1. **Authenticated e2e:** set `E2E_STORAGE_STATE` for merchant routes; `E2E_STORE_SLUG` for storefront.
2. **Playwright Chromium download:** geo-blocked; suite uses `channel: "chrome"`.
3. **Onboarding wizard:** some native inputs may remain in intermediate steps — continue shadcn FormSection pass.
4. **TanStack DataTable:** table primitives used; full column-visibility DataTable composite not fully generalized everywhere.
5. **Dark mode:** still out of scope (ADR-125 non-goal).
6. **Pre-existing unit failures (unrelated to UI):** docker-compose worker command string; Mongo live Compose timeout when Mongo half-available.
7. **Calendar:** no Gregorian date-picker SoT shipped; Jalali display retained.

## Blockers / follow-ups

- Wire CI Playwright with system Chrome or mirrored browser artifacts for Iran.
- Seed demo store + merchant storageState for full route coverage in CI.
- Optional: move ADR-125 from `adrs/tasks/` to `done/` after product sign-off.
- Chart primitives: add Recharts-backed dashboard sparklines when analytics UX ADR expands.

## Validations

- `npm run typecheck` — green
- `npm run lint` — green (after unused-import cleanup)
- UI unit tests (`src/components`, merchant/customer dashboard contracts) — updated & green
- `npm run test:e2e` public suite — green (21/21 runnable)

## Iranian First

- `lang=fa` / `dir=rtl` preserved
- Teal ADR-020 tokens retained (sidebar mapped to brand, not slate)
- تومان / Jalali composites retained
- Touch targets ≥44px on Button defaults
