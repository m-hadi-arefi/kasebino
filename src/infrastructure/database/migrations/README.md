# Drizzle Kit migrations (ADR-046 / ADR-092)

Versioned SQL generated **only** by `drizzle-kit generate` (`npm run db:generate`).

## Apply (local Compose)

1. `docker compose up -d postgres` (UTF-8 init via `POSTGRES_INITDB_ARGS`)
2. Set `DATABASE_URL=postgres://merchantos:merchantos@localhost:5432/merchantos`
3. `npm run db:migrate` — deploy job **before** app traffic (never auto-migrate on boot in prod)

## Baseline (ADR-092)

- `0000_*.sql` — full MVP OLTP baseline: merchants, stores, memberships, catalog, inventory, sales, loyalty, orders, payments, admin, outbox, notifications, **identity** (`auth_users`, `merchant_otp_challenges`, `customer_identities`, `customer_otp_challenges`)
- Meta journal under `meta/` — do not hand-edit

## Drift gate

- `npm run db:check` (`drizzle-kit check`) must pass in CI — fails when schema drifts without a matching migration

## Expand / contract (breaking changes)

Forward-only in production. For renames, type changes, or NOT NULL on existing rows:

1. **Expand** — add new nullable column / dual-write path
2. Backfill online without long ACCESS EXCLUSIVE on hot tables when possible
3. Switch readers/writers
4. **Contract** — drop old column in a later migration

Never single-step drop+recreate columns that hold Persian UTF-8 text. Never hand-author baseline SQL outside drizzle-kit. No Prisma/TypeORM migrations.

## Iranian First

- Preserve UTF-8 Persian text — no ASCII-only collations or destructive rewrites of `fa` columns
- Money columns stay integer IRR minor units; تومان formatting is presentation-only
- Phone columns use national `09…` + E.164

See `src/migration-strategy/` and `docs/tech/drizzle-orm.md`.
