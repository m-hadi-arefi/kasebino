# 20 — Future Microservice Extraction

## When to extract

Extract a module only when ≥2 are true:

- Independent scale profile (e.g., realtime fan-out vs POS)
- Separate team ownership
- Deploy cadence decoupling needed
- Clear published language via events/APIs already stable

## Likely extraction order

1. Realtime gateway (EMQX-facing BFF)
2. Loyalty engine
3. Analytics projections
4. Notifications / SMS
5. Catalog read API for storefront CDN edge

## Prerequisites built in Phase 1

- Module boundaries under `src/modules/*`
- Domain events + outbox
- No cross-module DB joins in domain services (prefer application composition)
- Ports/adapters for SMS, payments, storage, mqtt

## Forbidden until criteria met

- Premature multi-repo split
- Distributed transactions (2PC)
- Shared Drizzle client across deployables without ownership

## Migration pattern

Strangler: keep monolith route → delegate HTTP/event to new service → remove local implementation → keep contract tests.
