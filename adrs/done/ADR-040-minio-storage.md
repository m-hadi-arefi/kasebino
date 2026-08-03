# ADR-040 — File Storage MinIO Strategy

| Field | Value |
| --- | --- |
| ID | ADR-040 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Receipts, product images, logos, QR assets.

## Problem Statement

DB BLOBs hurt backups.

## Decision

MinIO S3 API; presigned upload/download; keys in PG.

## Why This Decision / Rationale

Local S3 parity.

## Alternatives Considered

Cloud S3 only; filesystem disk.

## Tradeoffs

Another service.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Buckets receipts/products/merchantdocs.

## Domain Impact

ReceiptRef VO.

## Analytics Impact

N/A

## Security Impact

Private buckets; type/size limits.

## Implementation Requirements

ARD-007, 004, 033.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-029

## Related ADRs

ADR-029

## Related Documents

docs/tech/minio.md

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

Private buckets; type/size limits.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

CDN in front.

## Iranian User Experience Requirements

- **Persian localization impact:** Alt text / file labels user-facing Persian when shown in UI.
- **RTL requirements:** Media galleries RTL.
- **Mobile usability impact:** Compress images for mobile catalog browsing.
- **Iranian business workflow impact:** Product imagery for local storefront branding.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
