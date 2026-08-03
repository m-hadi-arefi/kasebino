# Database Rules

1. PostgreSQL is the system of record; **Drizzle ORM** is the only ORM.
2. UUID PKs; `created_at` / `updated_at` on every table; soft deletes where applicable.
3. Tenant columns (`merchant_id`) + composite/partial uniques per `data-modeling-guidelines.md`.
4. Migrations via **Drizzle Kit** only (forward-only in production).
5. Indexes designed query-first — see `indexing-strategy.md` (never “hope the ORM indexes”).
6. Transactions for multi-aggregate POS completion (UoW) via Drizzle `db.transaction`.
7. No unbounded table scans for dashboards — projections + Redis.
8. All access through repositories; domain/UI never import Drizzle.
9. Follow `docs/rules/drizzle-rules.md` completely.
10. No ARD Done without database design + migration review (quality gate).
11. Store Persian/Unicode text as UTF-8; design indexes/search with Persian product/customer text in mind (`iranian-first-development.md`).
12. Persist money as integer minor units; presentation formats تومان for Iranian UX.
