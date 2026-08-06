# ADR-125 — Production UI Shell + Page Migration

| Field | Value |
| --- | --- |
| ID | ADR-125 |
| Status | `Proposed` |
| Date | 2026-08-06 |
| Origin | Production-grade frontend redesign (staff + admin + storefront + marketing) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` — Implementation tracking: `adrs/STATUS.md`, plan `docs/execution/plans/ADR-125.md`.

## Title

Production UI Shell + Full Frontend Page Migration to shadcn

## Context

ADR-020 tokens and ADR-114 MVP primitives exist and are showcased at `/ui-kit`, but product pages still use native HTML controls and hub-and-spoke navigation. No persistent app shell. Visual quality is MVP wireframe, not production SaaS polish.

## Problem Statement

Without a shared shell, reusable composites, and systematic shadcn adoption, MerchantOS cannot feel like a premium Iranian retail OS.

## Goals

- Desktop sidebar + mobile bottom nav for merchant and admin (POS denser full-bleed exception).
- Expand shadcn primitives needed for nav, feedback, forms, and data display.
- Shared composites: PageHeader, Empty/Error/Loading states, ConfirmDialog, FilterBar, DataTable, StatCard, etc.
- Migrate every merchant, admin, storefront, and marketing page to the design system.
- Playwright route audit (responsive + console) with screenshots and a completion report.

## Non Goals

- New product features or API changes.
- Dark mode / ThemeProvider.
- Replacing teal brand palette or Vazirmatn.
- Gregorian-only calendar UX (Jalali remains authoritative for merchant-facing dates).
- Forcing DataTable onto POS cart density.

## Functional Requirements

- FR-1: Merchant/Admin shells with sidebar (`lg+`) and bottom nav (`<lg`); exclude login/onboarding from shell; POS uses minimal chrome.
- FR-2: Storefront chrome with brand header + portal bottom nav on dashboard routes.
- FR-3: All interactive controls prefer shadcn when a primitive exists.
- FR-4: Persian RTL copy; touch targets ≥44px; Iranian First checklist for user-facing surfaces.
- FR-5: Playwright audits every route at 390 / 768 / 1440; no horizontal overflow; no page errors.
- FR-6: Completion report at `docs/uiux/audits/production-ui-redesign-report.md`.

## Technical Design

1. Expand `src/components/ui/*` via shadcn CLI (RTL new-york, existing CSS variables).
2. Add layout/composites under `src/components/layout/` and `src/components/composites/`.
3. Wire shells in `app/(merchant)/layout.tsx`, `app/(admin)/layout.tsx`, storefront layout refinements.
4. Migrate pages continuously; remove duplicated nav pills and dashboard debug session card.
5. Install `@playwright/test`; auth strategy: public routes always; gated routes use storageState fixture when credentials available, otherwise soft-skip with documented debt.
6. Token polish only (shadow-md, focus, reduced-motion) — no rebrand.

## Dependencies

- ADR-018, ADR-019, ADR-020, ADR-021, ADR-022, ADR-023, ADR-114

## Iranian User Experience Requirements

- `lang=fa` / `dir=rtl`; Persian empty/error/loading copy.
- تومان labels; Jalali dates via existing composites.
- Mobile-first POS density preserved.

## Acceptance Criteria

- [ ] Shared shells live and used by merchant/admin authenticated pages.
- [ ] Product pages use shadcn + shared composites (no raw developer HTML chrome).
- [ ] Playwright suite exists and audits route manifest.
- [ ] Report delivered with pages, components, debt, screenshots.

## Estimated Complexity

**XL**
