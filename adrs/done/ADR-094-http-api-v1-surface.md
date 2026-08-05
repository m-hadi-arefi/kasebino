# ADR-094 - Ship HTTP /api/v1 Route Handlers for MVP Domains

| Field | Value |
| --- | --- |
| ID | ADR-094 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Ship HTTP /api/v1 Route Handlers for MVP Domains

## Context

Only `GET /api/health` and `POST /api/v1/realtime/token` exist. Domain use cases are unreachable from clients. API standards live in `src/api-standards` (ADR-030).

## Problem Statement

Without versioned HTTP handlers, merchant POS, CRM, catalog, loyalty, pickup, payments, notifications, and admin cannot function end-to-end.

## Goals

- Ship Zod-validated `/api/v1` handlers for all MVP domains.
- Envelope errors and `correlationId` per ADR-030.
- Audience separation: merchant, customer, admin, public storefront.
- Idempotency-Key support for sale and payment-sensitive mutations.

## Non Goals

- GraphQL / tRPC as primary surface.
- Marketplace multi-merchant catalog APIs.
- Delivery/courier endpoints.

## Functional Requirements

- FR-1: Merchant and customer OTP request/verify endpoints (with ADR-095/103).
- FR-2: Merchant/store endpoints for onboarding (ADR-121).
- FR-3: Catalog, inventory, POS sales, CRM, loyalty, orders, payments, notifications, admin routes.
- FR-4: Public storefront read DTOs with ACL (ADR-077).
- FR-5: Payment webhook endpoint (ADR-102).
- FR-6: OpenAPI or typed contract tests for critical routes.

## Technical Design

1. App Router `app/api/v1/**/route.ts` files call application use cases only.
2. Composition root (ADR-123) injects Drizzle repos + ports.
3. Shared helpers: `parseBody(zod)`, `ok()`, `fail(envelope)`, `requireAuth()`.
4. Rate-limit hooks from ADR-108 on auth/OTP paths.
5. No business logic in route files (ADR-029).

## Database Changes

- None beyond ADR-093 repositories.

## Backend Changes

- Route handlers + DTO ↔ domain mappers.

## Frontend Changes

- None in this ADR (feature ADRs consume APIs).

## Admin Changes

- `/api/v1/admin/merchants` list/get/activate/suspend (RBAC ADR-113).

## API Changes

| Prefix | Audience |
| --- | --- |
| `/api/v1/auth/merchant/*` | public → merchant session |
| `/api/v1/auth/customer/*` | public → customer session |
| `/api/v1/merchants`, `/api/v1/stores` | merchant |
| `/api/v1/catalog/*`, `/api/v1/inventory/*` | merchant |
| `/api/v1/pos/sales` | merchant staff |
| `/api/v1/crm/*`, `/api/v1/loyalty/*` | merchant |
| `/api/v1/orders/*` | merchant + customer |
| `/api/v1/payments/*` | system/customer |
| `/api/v1/storefront/{slug}/*` | public |
| `/api/v1/notifications/*` | authenticated |
| `/api/v1/admin/*` | platform_admin |

## Security Considerations

- Deny by default; JWT audience must match route class.
- Never return OTP outside controlled local/dev (ADR-095).
- Public storefront DTOs strip internal cost/staff fields.
- Validate Idempotency-Key where required.

## Edge Cases

- Client retries after 500 when mutation+outbox already committed - same idempotency key must no-op safely.
- Wrong audience token → 401/403 envelope.

## Acceptance Criteria

- [ ] Critical path APIs work against Compose Postgres without in-memory DI.
- [ ] Zod failures return `VALIDATION` envelope with `correlationId`.
- [ ] Auth/OTP routes enforce rate-limit policy (Redis live or documented local fallback).
- [ ] Contract tests cover auth, POS sale, storefront catalog, admin suspend.

## Rollout Plan

Land after ADR-093 factories exist; open storefront public reads only when catalog data can populate.

## Dependencies

- ADR-093, ADR-030, ADR-108, ADR-123
- Domain ADRs 005–013

## Risks

- Over-broad storefront DTO leakage.
- Handler sprawl without shared error helpers.

## Related Documents

- ADR-030
- `PRD.md` §8, §11.2
- `AUDIT_REPORT.md`

## Iranian User Experience Requirements

- Persian validation messages for client-visible API errors where UI surfaces them.
- Obey Iranian First rules for any developer-facing demo pages.

## Estimated Complexity

**XL**
