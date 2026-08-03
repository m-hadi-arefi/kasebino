# ARD-017 — PWA

| Field | Value |
| --- | --- |
| ID | ARD-017 |
| Title | PWA |
| Status | `in_progress` |
| Milestone | M5 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Installable **merchant staff** PWA with offline product search and sale queue + background sync (P1 OK after online POS).  
**Customer store PWAs are out of scope here — see ARD-029.**

## Business Value

Keeps counter selling during flaky networks.

## Requirements

- NFR-06
- NFR-07
- POS-04 camera
- POS-08
- Must not collide with per-store customer PWA branding/manifests (ARD-029)

## Dependencies

- ARD-007
- ARD-005
- Coordinate with ARD-029

## Architecture

Service worker, manifest, IndexedDB queue, sync API with idempotency, conflict UX.

## Domain Model

Uses SaleDraft client model; server CompleteSale idempotent.

## API Contracts


| Method | Path |
| --- | --- |
| POST | `/api/v1/sales/sync` | batch queued sales |


## Events

- `SaleCompleted on successful sync`

## Caching

Client catalog snapshot versioning; server cache unchanged.

## Security

Don't store secrets in IDB; conflict policy documented.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

Server: reuse sales idempotency; optional `sale_sync_batches` audit

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: Optional sync audit table

### Repository Interfaces

Reuse SaleRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Each synced sale = full CompleteSale TX

### Caching Strategy

Client IDB; server cache unchanged


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

Server: reuse sales idempotency; optional `sale_sync_batches` audit

### Relationships

N/A mandatory

### Constraints

Idempotency keys mandatory

### Indexes

idempotency unique already

### Query Patterns

POST sync batch → CompleteSale path

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Burst on reconnect

### Caching Plan

Client IDB; server cache unchanged

### Migration Plan

Optional sync audit table

## Testing

Offline queue e2e with service worker test plan.

## Acceptance Criteria

- [ ] Drizzle migrations generated and reviewed
- [ ] Table design reviewed
- [ ] Query patterns reviewed
- [ ] Indexes + composite indexes reviewed
- [ ] Multi-tenancy (`merchant_id`) reviewed
- [ ] PostgreSQL performance considerations reviewed
- [ ] Drizzle schema reviewed against DB design (ORM follows DB)
- [ ] Cache strategy reviewed
- [ ] Repository interfaces + Drizzle implementations aligned
- [ ] Transaction boundaries implemented/documented


- [ ] Installable PWA
- [ ] Offline queue survives reload
- [ ] Sync completes or surfaces conflicts
- [ ] Camera barcode supported on mobile browsers

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.
- Storefront SEO metadata Persian when applicable.

## RTL Requirements

- Implement RTL-first (`dir=rtl`, logical CSS).
- Mirror directional icons/navigation.
- No LTR-only layouts for in-scope screens.

## Persian UX Requirements

- Persian typography; strings must not clip or overflow.
- Plain-language errors for traditional merchants.
- Jalali dates + تومان formatting wherever shown.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.
- Customer journeys assume phone OTP + store visit.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

No ARD is complete without **database design review** and **Drizzle migration review** (see quality gate in `drizzle-rules.md`).

Inherits global DoD from PRD §17 / `docs/product/non-functional-requirements.md`, plus all acceptance criteria above and checklists below.

## Implementation Checklist

- [x] Manifest + staff install UX foundations (ADR-022: `src/staff-pwa`, `/staff/manifest.webmanifest`, POS banner)
- [x] Service worker (ADR-024: `public/sw-staff.js` + staff registration)
- [x] IDB queue (ADR-024: `src/pos-offline` SaleDraft port + in-memory adapter)
- [x] Sync API (ADR-024: `POST /api/v1/sales/sync` contract + flush helper)
- [x] Offline UX banners wired to live queue (ADR-024: `StaffOfflineStatus` + Persian copy)
- [x] Isolation from store customer PWA (ADR-023) tests
- [x] Installability tests (manifest + Persian install chrome)
- [ ] Offline queue e2e (browser IDB + Background Sync — remain)

## Validation Checklist

- [x] iranian-first-development.md conformance (install chrome + offline banners)
- [x] iranian-feature-checklist.md passed for install UX + offline banners (Jalali N/A; تومان wording)
- [x] RTL + Persian copy reviewed for install chrome + offline status
- [x] drizzle-rules.md conformance (N/A — reuse sales idempotency; no new sync audit table)
- [x] database design quality gate (N/A this slice — reuse `(merchant_id, idempotency_key)`)
- [x] Drizzle Kit migration reviewed (N/A this slice)

- [x] lint / typecheck / tests for ADR-022 + ADR-024 slice
- [x] full offline pwa checklist (ADR-024 contract + in-memory queue + SW stub)

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
