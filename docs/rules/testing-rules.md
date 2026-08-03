# Testing Rules

Binding: ADR-078 (`src/testing-strategy/`). Pyramid detail: [test-pyramid.md](../testing/test-pyramid.md), [strategy.md](../testing/strategy.md).

1. Domain logic: unit tests without DB (Vitest).
2. Use cases: integration tests with DB/redis testcontainers or compose (ADR-079 wiring).
3. AuthZ / tenant isolation tests required when auth or data is touched.
4. Critical POS CompleteSale path covered; no delivery-as-required e2e in MVP.
5. No empty tests; assertions on observables.
6. Deterministic time / phone fixtures.
7. When UX is in scope: Persian (`fa-IR`) string regression; تومان / Jalali format tests when those helpers are touched; RTL/layout checks where primary shells are feasible.
8. CI / local gate: `npm run validate` (`typecheck` && `lint` && `test`) must remain green.
