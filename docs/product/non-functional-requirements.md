# Non-Functional Requirements

From PRD §10–§16.

| ID | Category | Requirement | Primary ARDs |
| --- | --- | --- | --- |
| NFR-01 | Performance | Checkout < 5s; barcode ≤ 1s; search ≤ 100ms p95 | ARD-007, ARD-019, ARD-020 |
| NFR-02 | Scalability | Stateless instances; horizontal scale | ARD-019, ARD-020 |
| NFR-03 | Availability | Zero-downtime deploy strategy | ARD-019, ARD-020 |
| NFR-04 | Security | HTTPS, secure cookies, JWT rotation, Zod, CSRF/XSS/SQLi | ARD-002, ARD-020 |
| NFR-05 | Observability | Structured logs, health, metrics, OTel-ready, errors | ARD-020 |
| NFR-06 | Mobile | Mobile-first Iranian Android UI; installable PWA | ARD-017, UI rules |
| NFR-07 | Offline | Offline search + sale queue + sync (P1 OK) | ARD-017 |
| NFR-08 | Landing | Lighthouse ≥ 95 Perf/SEO/A11y/Best Practices; Persian SEO | ARD-020 / landing work |
| NFR-09 | App quality | DoD Lighthouse > 90 primary merchant screens | All UI ARDs |
| NFR-10 | Compliance eng | Soft deletes, audit logs, UUID PKs, timestamps | All domain ARDs |
| NFR-11 | Iranian First | Persian, RTL, Jalali, تومان, Iranian phone/SMS | All ARDs; iranian-first-development.md |

## Architecture principles (binding)

- Phase 1 modular monolith; Phase 2 extraction-ready
- DDD, event-driven, Clean Architecture + SOLID + DIP
- Stateless services; containerized deploy
- CQRS-ready / ES-compatible design (full ES not required for MVP)

## Definition of Done (global)

Copied from PRD §17 — every ARD inherits this base:

- Domain logic in correct layer
- Tests implemented
- API documented
- Domain events published where applicable
- Cache invalidation handled
- Authorization enforced
- Audit logs for sensitive mutations
- Realtime where applicable
- Mobile responsive (Iranian Android-class)
- Persian + RTL; Jalali + تومان where dates/money shown
- Iranian feature checklist when UX in scope
- Lighthouse > 90 on primary screens
- TypeScript strict passes
- No ESLint warnings
- No build warnings
