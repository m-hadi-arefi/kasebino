# ARD-022 — Audit Logging System

| Field | Value |
| --- | --- |
| ID | ARD-022 |
| Title | Audit Logging System |
| Status | `todo` |
| Milestone | M5 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | analytics-requirements.md + security docs |

> **ADR-058 foundations (2026-08-03):** `src/audit-logging` — AuditPort → insert-only Mongo `mos_audit`, sensitive-action matrix, Iranian phone PII scrubbing, Persian action labels, fail-open when Mongo down, access-itself-audited helper (in-memory store).
>
> **ADR-064 foundations (2026-08-03):** Canonical audit TTL 24–36m + legal hold in `src/data-retention`. This ARD remains `todo` until admin query API + uiuxpromax audit browser + live Mongo driver/TTL job.

## Objective

Implement immutable audit logging to MongoDB for all sensitive actions, with admin query APIs, retention, and hooks from auth/merchant/sale/admin flows.

## Business Value

Compliance evidence, fraud forensics, and admin accountability.

## Requirements

- PA-03, PA-10, NFR-10
- Security audit requirements in architecture docs

## Dependencies

- ARD-021
- ARD-002, ARD-003
- ARD-018 hooks

## Architecture

`AuditPort` invoked from application services after successful sensitive mutations (async preferred). MongoDB `mos_audit` insert-only. Optional thin PostgreSQL `audit_logs` for same-TX bootstrap compatibility — Mongo remains long-term SoR for audit analytics.

## Domain Model

Audit policies/catalog of sensitive actions; persistence models in infrastructure.

## API Contracts

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/admin/audit` | `platform_admin` filters |
| GET | `/api/v1/admin/audit/:eventId` | detail |

## Events

- `AuditRecordWritten`

## Persistence Strategy

### PostgreSQL + Drizzle

Optional thin `audit_logs`; not required for full acceptance if Mongo path is complete.

### MongoDB

`mos_audit` with indexes: `merchantId+occurredAt`, `actorId+occurredAt`, `action+occurredAt`, unique `eventId`; TTL per retention architecture.

## Database Design

Document schema per `docs/architecture/audit-architecture.md`. Estimated load: proportional to sensitive mutation rate (≪ clickstream).

### Caching Plan

Do not broadly cache audit search results.

## Security

Admin-only reads; viewing audit is itself audited; minimize PII in before/after.

## Analytics / Audit / Tracking Requirements

Before implementation list:

- Analytics events: none required beyond audit-adjacent ops metrics
- **Audit events:** full sensitive-action matrix from audit-architecture
- Tracking events: N/A
- Dashboard metrics: audit write failures, search latency

## UI Requirements

- **uiuxpromax REQUIRED** for admin audit browser (may live under admin shell)

## Testing

Insert-only guarantees; tenant isolation; retry on Mongo failure after commit.

## Acceptance Criteria

- [x] Sensitive actions produce Mongo audit records (foundation: AuditPort → `mos_audit`)
- [ ] Admin can search by merchant/actor/action/time (store search ready; HTTP API remain)
- [x] No update/delete API for audit documents
- [x] Retention policy configured (TTL stance documented; live TTL job remain)
- [x] Event matrix documented in progress-log

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
- Reports: Persian labels + Jalali/`Asia/Tehran` buckets for humans.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + `audit-rules.md` + `mongodb-rules.md`.

## Implementation Checklist

- [x] Read audit/mongodb/analytics/warehouse/observability architectures
- [x] AuditPort + instrumentation matrix across ARDs (foundation in `src/audit-logging`)
- [ ] Admin query API (+ UI via uiuxpromax)
- [x] Tests + docs + STATUS (ADR-058 package; ARD remains open for API/UI)

## Validation Checklist

- [x] iranian-first-development.md conformance (labels + phone scrub; UI N/A)
- [x] iranian-feature-checklist.md passed (or N/A with reason) — UX screens N/A; Persian labels + RTL stubs
- [ ] RTL + Persian copy reviewed for in-scope screens (admin browser remaining)
- [x] lint / typecheck / tests (ADR-058)
- [x] audit-rules + mongodb-rules conformance (foundation)

## Completion Protocol

Update STATUS + progress-log.
