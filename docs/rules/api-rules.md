# API Rules

Source: ADR-030 (`src/api-standards`). Architecture note: `docs/architecture/15-api-architecture.md`.

1. Stable error envelope with `correlationId` — `message` is Persian (`fa-IR`); `code` is a stable English machine key (optional client map via `API_ERROR_MESSAGES_FA`).
2. `Idempotency-Key` on sale complete and order create.
3. Version externalized JSON under `/api/v1` (ops probes `/api/health` and `/api/ready` may stay unversioned).
4. Never return OTP in production.
5. Authorization checked in application service (presentation reads Bearer/cookie only).
6. Document endpoints in the owning ARD.
7. Zod-validate inputs/outputs at the Route Handler boundary (when handlers land).
8. JSON wire: **camelCase**; DB columns: **snake_case** — map at repository/presentation boundary.
9. Public / storefront DTOs must not leak cost, PII (Iranian phone), OTP/tokens, or soft-delete metadata (ADR-077 `src/api-protection`).
10. CORS locked to configured app origins — no wildcard for credentialed surfaces (ADR-077).
