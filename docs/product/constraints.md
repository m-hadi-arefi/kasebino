# Constraints

## Hard product constraints

- **Iranian-native product:** Persian language, RTL UI, Jalali dates, تومان display, Iranian phone/SMS are mandatory for merchant/customer UX.
- Phone-only auth (no email/password) for merchant login.
- OTP mandatory before JWT/session.
- Customer phone required at POS checkout.
- Merchant owns the customer relationship (no marketplace browsing).
- Modular monolith in Phase 1; microservice-ready seams required.

## Hard technical constraints

| Area | Constraint |
| --- | --- |
| Locale / UX | `fa-IR`, RTL-first, Jalali presentation, تومان formatting — `iranian-first-development.md` |
| App | Next.js 15+ App Router, TypeScript strict |
| UI | Tailwind + shadcn/ui (RTL); uiuxpromax mandatory for UI work |
| DB | PostgreSQL + **Drizzle ORM only** (OLTP); UUID PKs; soft deletes; timestamps; audit fields; query-first indexes; UTF-8 Persian text/search |
| Analytics DB | **MongoDB** for warehouse/audit/telemetry (not OLTP SoT); Persian/Jalali dashboards for humans |
| Cache | Redis mandatory; cache-aside primary |
| Realtime | EMQX MQTT mandatory for listed events |
| Storage | MinIO for objects |
| Auth | NextAuth + JWT strategy + SMS OTP (Persian templates; Iranian MSISDN) |
| Deploy | Docker + Docker Compose local parity; containerized all envs |
| Quality | Lighthouse landing ≥ 95; primary screens > 90; no lint/build warnings; Iranian feature checklist |

## Rate limiting (Redis)

| Scope | Limit |
| --- | --- |
| Default per route / IP / user | 10 req/s |
| Auth routes | 5 req/min |
| OTP routes | 3 req/min |
| Admin routes | 20 req/s |

## Performance budgets

- POS checkout < 5s
- Barcode resolve ≤ 1s
- Product search ≤ 100ms p95 (cached/local catalogs)

## AI execution constraints

- No feature work outside unfinished ARDs via `ard-to-code`.
- No application code from documentation-generation tasks.
- Validation steps are never optional.
