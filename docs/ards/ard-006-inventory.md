# ARD-006 — Inventory

| Field | Value |
| --- | --- |
| ID | ARD-006 |
| Title | Inventory |
| Status | `todo` |
| Milestone | M1 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Track stock per store/product with adjustments and low/out-of-stock events.

## Business Value

Prevents selling blind; feeds realtime and storefront availability.

## Requirements

- Inventory* events
- POS sale decrement dependency

## Dependencies

- ARD-005

## Architecture

Inventory module; StockItem aggregate; policies for low/out thresholds.

## Domain Model

StockItem; domain service adjustments.

## API Contracts


| Method | Path |
| --- | --- |
| GET | `/api/v1/inventory` |
| POST | `/api/v1/inventory/adjust` |
| GET | `/api/v1/inventory/:productId` |


## Events

- `InventoryChanged`
- `InventoryLow`
- `InventoryOutOfStock`

## Caching

Stock keys TTL 300s; invalidate on change.

## Security

Only authorized staff adjust; audit adjustments.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`stock_items`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: inventory schema

### Repository Interfaces

StockItemRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Adjust in TX; sale decrement joined in POS TX

### Caching Strategy

stock keys TTL 300s


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`stock_items`

### Relationships

UNIQUE(merchant_id, store_id, product_id); FK product/store

### Constraints

quantity >= 0 (MVP); version for optimistic lock

### Indexes

unique triple; partial low-stock

### Query Patterns

get stock; adjust; decrement in sale

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: ≈ products × stores

### Caching Plan

stock keys TTL 300s

### Migration Plan

inventory schema

## Testing

No negative stock tests; event emission tests.

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


- [ ] Adjust stock
- [ ] Events fire at thresholds
- [ ] Sale integration port ready

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.

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
- Counter/scan UX optimized for noisy shop environments.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

No ARD is complete without **database design review** and **Drizzle migration review** (see quality gate in `drizzle-rules.md`).

Inherits global DoD from PRD §17 / `docs/product/non-functional-requirements.md`, plus all acceptance criteria above and checklists below.

## Implementation Checklist

- [x] Domain+API (domain + StockAdjusted stub; API routes deferred)
- [x] Event handlers stubs (StockAdjusted + InventoryChanged/LowDetected/Depleted; ADR-049 sync)
- [ ] UI stock view
- [x] Tests (domain/unit + sync hooks)
- [x] Sync strategy (ADR-049 CompleteSale TX / pickup paid / optimistic version / offline reject-and-review)

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] lint
- [ ] typecheck
- [ ] tests

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
