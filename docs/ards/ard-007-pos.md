# ARD-007 — POS

| Field | Value |
| --- | --- |
| ID | ARD-007 |
| Title | POS |
| Status | `todo` |
| Milestone | M1 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

> **ADR-009 domain foundations (2026-08-03):** `src/pos-sales` contract + `src/modules/pos` Sale/Cart/CompleteSale (tender enum, Idempotency-Key, membership + inventory ports, SaleCompleted, loyalty earn stub) + Drizzle `sales`/`sale_lines` stubs are in. **ADR-040 (2026-08-03):** MinIO `ObjectStoragePort` + `ReceiptRef` in `src/minio-storage/` (receipts bucket). **ADR-025 (2026-08-03):** Zustand POS cart client state (`src/state-management` + `src/modules/pos/ui/state`). **ADR-026 (2026-08-03):** TanStack Query data-fetching contract (`src/data-fetching`) for POS/CRM client lists (short POS staleTimes; no RSC waterfall). **ADR-027 (2026-08-03):** form/validation capacity (`src/forms-validation`) — Iranian mobile + تومان Zod schemas + RHF resolver for upcoming POS phone/price UI. This ARD remains `todo` until API routes, migrations, receipt PDF render + CompleteSale↔MinIO wiring, outbox wiring, and uiuxpromax POS UI.

## Objective

Deliver fast in-store checkout: search/scan, cart, mandatory phone capture, payment complete, receipt, and SaleCompleted orchestration.

## Business Value

Core product moment — retention starts here.

## Requirements

- POS-01..07
- POS-08 deferred to ARD-017 as P1
- NFR-01

## Dependencies

- ARD-002
- ARD-005
- ARD-006
- ARD-008 (customer upsert port — may stub then integrate)
- ARD-009 (loyalty ports — integrate or feature-flag)

## Architecture


POS application service CompleteSale as unit of work: persist sale, upsert **store membership** + customer, decrement stock, loyalty earn/redeem ports, receipt to MinIO, outbox events.
Client POS UI Zustand cart + scanner.

### Analytics / audit hooks (non-blocking)

After successful commit/outbox:

- Domain events mirrored to warehouse when ARD-021/024 available
- AuditPort for sale complete/cancel when ARD-022 available
- Product analytics UX timings when ARD-023 available
- MembershipCreated when new member via POS

Mongo/analytics failures must **not** fail checkout.


## Domain Model

Sale aggregate + SaleLine; ReceiptRef VO.

## API Contracts


| Method | Path | Headers |
| --- | --- | --- |
| POST | `/api/v1/sales/complete` | Idempotency-Key |
| GET | `/api/v1/sales/:id` | |
| GET | `/api/v1/sales/:id/receipt` | |


## Events

- `SaleCreated`
- `SaleCompleted`
- `SaleCanceled`

## Caching

Invalidate analytics, stock, customer stats, wallet on completion.

## Security

AuthZ merchant staff; idempotency; audit sale complete.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`sales`, `sale_lines`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: sales schema + heavy indexes reviewed

### Repository Interfaces

SaleRepository (+ ports to customer/stock/loyalty repos in UoW) — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

**Critical:** single Drizzle transaction spanning sale, lines, stock, customer upsert, loyalty, outbox

### Caching Strategy

Invalidate analytics/stock/customer/wallet on complete


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`sales`, `sale_lines`

### Relationships

lines → sales; sales → store/customer/merchant

### Constraints

status checks; line qty > 0; idempotency unique; money >= 0

### Indexes

sales tenant+time; customer+time; status; lines(sale_id); product analytics

### Query Patterns

CompleteSale UoW; receipt load; recent sales

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Primary write path toward 50M+ transactions

### Caching Plan

Invalidate analytics/stock/customer/wallet on complete

### Migration Plan

sales schema + heavy indexes reviewed

## Testing

E2E checkout timing harness; unmatched barcode UX test.

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


- [ ] Checkout <5s happy path in staging/dev harness
- [ ] Phone required
- [ ] Receipt generated
- [ ] Events published
- [ ] Customer linked

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

- [ ] Invoke uiuxpromax for POS screens
- [ ] Implement Sale domain + CompleteSale
- [ ] Scanner + search UI
- [ ] Receipt storage
- [ ] Tests + perf notes

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] lint
- [ ] typecheck
- [ ] unit
- [ ] integration sale
- [ ] UI a11y smoke

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
