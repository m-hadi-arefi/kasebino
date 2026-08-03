# Testing Strategy

Binding contract: `src/testing-strategy/` (ADR-078). Layer tooling depth: ADR-079.

| Layer | Scope | Tools (intended) |
| --- | --- | --- |
| Domain unit | Invariants, policies (no DB) | **Vitest** (Jest considered) |
| Application integration | Use cases + DB / Redis / outbox | Testcontainers / Compose (ADR-079) |
| API | Route contracts | Supertest / Fetch |
| UI e2e | Critical flows (auth, POS, pickup) | Playwright (ADR-079); mobile viewports |
| Perf smoke | Barcode / checkout budgets | custom timing harness (ADR-079) |
| A11y | Primary screens | axe / Lighthouse |

## Pyramid

1. **Many** domain unit tests  
2. **Fewer** integration tests around use cases / outbox / cache  
3. **Few** e2e journeys — auth, POS CompleteSale, storefront pickup order  

Rejected: e2e-only strategy.

## Mandatory gates

- **Tenant isolation tests** required whenever tenant/OLTP data paths are touched (ADR-048).
- **AuthZ tests** required whenever auth/authorization is touched.
- **Persian string regression** when UX copy is in scope; fixtures may include Persian names; تومان / Jalali format tests when money/date display helpers are touched.
- **POS CompleteSale** is a **must-cover** money path. Delivery is not a required MVP journey.

## CI validate gate

`npm run validate` = `typecheck` + `lint` + `test` (Vitest). Remains the local/CI quality gate; workflow YAML expands under ADR-069.
