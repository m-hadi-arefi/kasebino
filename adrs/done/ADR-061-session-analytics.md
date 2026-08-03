# ADR-061 — Session Analytics

| Field | Value |
| --- | --- |
| ID | ADR-061 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need engagement duration.

## Problem Statement

Anonymous multi-tab confusion.

## Decision

sessionId client UUID; heartbeat; 30m idle timeout; Session* events.

## Why This Decision / Rationale

Engagement KPIs.

## Alternatives Considered

Server sessions only.

## Tradeoffs

Approx boundaries.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

session API.

## Domain Impact

N/A

## Analytics Impact

Sessions/day metrics.

## Security Impact

N/A

## Implementation Requirements

ARD-027.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-060

## Related ADRs

ADR-060

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

Identity stitch post-login.

## Iranian User Experience Requirements

- **Persian localization impact:** Dashboard titles, legends, and exports for humans are Persian; event codes may be English.
- **RTL requirements:** Charts and filter bars layout RTL; axes/tooltips readable in Persian.
- **Mobile usability impact:** Reports skimable on tablet; avoid huge desktop-only bi tools for merchants.
- **Iranian business workflow impact:** Time buckets Jalali/`Asia/Tehran` for merchant-facing analytics.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
