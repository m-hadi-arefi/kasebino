# ADR-123 - Application Composition Root and Runtime Module Wiring

| Field | Value |
| --- | --- |
| ID | ADR-123 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Application Composition Root and Runtime Module Wiring

## Context

Modules expose use-case factories expecting injected ports, but App Router handlers and workers have no single composition root. Partial Drizzle repos exist alongside in-memory defaults. Infra clients (Redis/EMQX/MinIO/Mongo) are not composed.

## Problem Statement

Without a composition root, ADR-094 handlers and ADR-109 worker cannot reliably obtain production adapters; environments risk mixed in-memory/production wiring.

## Goals

- Central composition module(s) constructing use cases with env-appropriate adapters.
- Explicit test vs production bindings.
- Shared by HTTP routes and background worker.
- Document how to add a new module binding.

## Non Goals

- DI framework heavyweight container unless already chosen.
- Changing domain factory signatures unnecessarily.

## Functional Requirements

- FR-1: `createAppContext()` (name flexible) returns wired use cases for MVP domains.
- FR-2: Production binds Drizzle + Redis + MinIO + MQTT + Mongo (+ SMS/Payment per env).
- FR-3: Test binds in-memory / mocks.
- FR-4: Worker and Next route handlers import the same factories.
- FR-5: Fail fast on missing critical env in production (`DATABASE_URL`, etc.).

## Technical Design

1. Add `src/app-composition/` or `src/infrastructure/composition/`.
2. Read env via existing secrets patterns (ADR-068).
3. Lazy singleton per process for DB/Redis clients.
4. Feature flags for optional planes (Mongo/MQTT) with clear degraded modes.
5. No business logic in composition - wiring only (ADR-029).

## Database Changes

- None.

## Backend Changes

- Composition root; update ADR-094/109 entrypoints to consume it.

## Frontend Changes

- None.

## Admin Changes

- None.

## API Changes

- Indirect - handlers become functional.

## Security Considerations

- Do not instantiate console SMS / sandbox payment in production blindly.
- Secrets only from env.

## Edge Cases

- Hot reload creating multiple pools in dev - document Next.js caveats.
- Worker vs web process separate singletons OK.

## Acceptance Criteria

- [ ] Route handler integration test uses composition with Postgres.
- [ ] Worker boot uses same outbox/repo bindings.
- [ ] Production config rejects console SMS default.
- [ ] README/ops note documents composition entrypoint.

## Rollout Plan

Introduce with ADR-093/094; expand adapters as 108–111 land.

## Dependencies

- ADR-029, ADR-068, ADR-093, ADR-094, ADR-109
- ADR-108, ADR-110, ADR-111, ADR-115, ADR-102 as adapters appear

## Risks

- God-object context - keep modular `createXUseCases` assembly functions.

## Related Documents

- ADR-004 modular monolith
- ADR-029 layering

## Iranian User Experience Requirements

- N/A directly.

## Estimated Complexity

**M**
