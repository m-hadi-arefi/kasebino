# Test Pyramid

Binding: ADR-078 (`src/testing-strategy/`).

1. **Many** domain unit tests (Vitest, no DB) — invariants and policies  
2. **Fewer** integration tests around use cases / outbox / cache (Testcontainers or Compose — ADR-079)  
3. **Few** e2e journeys — auth, POS CompleteSale, storefront pickup order (Playwright — ADR-079; mobile viewports)

Relative volume must stay bottom-heavy. Rejected alternative: only e2e.

Tenant isolation tests are mandatory whenever data is touched. Persian string regression applies when UX copy is in scope.
