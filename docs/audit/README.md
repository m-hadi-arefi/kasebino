# MerchantOS audit pack (2026-08-09)

Code-backed gap analysis. Supersedes the optimism of older `AUDIT_REPORT.md` (2026-08-03) for **runtime** truth.

| Document | Purpose |
| --- | --- |
| [current-architecture-status.md](./current-architecture-status.md) | App + infrastructure architecture |
| [capability-matrix.md](./capability-matrix.md) | Feature × status × evidence |
| [database-status.md](./database-status.md) | Tables, migrations, integrity risks |
| [testing-gap-analysis.md](./testing-gap-analysis.md) | Unit / integration / e2e gaps |
| [production-readiness.md](./production-readiness.md) | MVP-calibrated scores |
| [next-development-roadmap.md](./next-development-roadmap.md) | Prioritized work |
| [incomplete-items.md](./incomplete-items.md) | Stubs, Fakes, unused schema |

**Source of truth:** `src/`, `app/`, schema, workers, tests — not ADR prose alone.

**Calibration:** scores against Iranian **local-retail MVP** (pickup-only, POS, CRM, storefront, sandbox→PSP path), not enterprise ERP completeness.
