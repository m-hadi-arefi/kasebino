# Drizzle Kit migrations (ADR-046)

Versioned SQL generated **only** by `drizzle-kit generate` (`npm run db:generate`).

- Apply with `npm run db:migrate` (`drizzle-kit migrate`) as a deploy job **before** traffic.
- Forward-only in production; expand/contract for breaking changes.
- Never hand-author baseline SQL here outside drizzle-kit.
- Preserve UTF-8 Persian text — no ASCII-only collations or destructive rewrites of `fa` columns.

Schema stubs: `../schema/merchants.ts` (ADR-005), `../schema/stores.ts` (ADR-006). Generate migrations via drizzle-kit when ARD-003 / ARD-004 persistence lands.
See `src/migration-strategy/`.
