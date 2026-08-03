# ADR-065 — Analytics Ingest Failure Isolation

| Field | Value |
| --- | --- |
| ID | ADR-065 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Mongo may be down.

## Problem Statement

Blocking checkout on analytics loses sales.

## Decision

After OLTP commit, analytics/audit via outbox/buffer; POS success independent of Mongo.

## Why This Decision / Rationale

PA-09 / reliability.

## Alternatives Considered

Sync Mongo in TX with sale.

## Tradeoffs

Telemetry delay.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Outbox / queue.

## Domain Impact

Sale path sacred.

## Analytics Impact

Ingest error metrics/alerts.

## Security Impact

N/A

## Implementation Requirements

All CompleteSale and track paths.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-056, ADR-035, ADR-009

## Related ADRs

ADR-056, ADR-035, ADR-009

## Related Documents

See docs/architecture and docs/tech as applicable.

## Migration Plan

- If greenfield: implement when this ADR is reached on the roadmap.
- If superseding prior practice: expand/contract; update ARDs; never silent break.

## Testing Requirements

- Acceptance criteria implied by Decision must be testable.
- Tenant isolation and authZ tests when data/auth touched.
- Performance budgets when POS/storefront touched.

## Operational Requirements

- Health/ready and runbooks updated if infra changes.
- Metrics/alerts for new failure modes.

## Security Considerations

N/A

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

DLQ dashboards.

## Iranian User Experience Requirements

- **Persian localization impact:** Audit UIs showing actions to humans use Persian labels; raw payloads may be JSON English keys.
- **RTL requirements:** Audit viewers RTL.
- **Mobile usability impact:** Investigations possible on modest ops devices.
- **Iranian business workflow impact:** Retention/compliance messaging for Iranian operators when exposed.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
