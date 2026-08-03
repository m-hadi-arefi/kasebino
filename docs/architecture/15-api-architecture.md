# 15 — API Architecture

**ADR:** [ADR-030](../../adrs/ADR-030-api-standards.md) · **Contract:** `src/api-standards` · **Protection:** [ADR-077](../../adrs/ADR-077-api-protection.md) `src/api-protection` · **Rules:** `docs/rules/api-rules.md`

## Styles

| Surface | Use |
| --- | --- |
| Route Handlers (`app/api/**`) | Public/mobile JSON APIs, webhooks, health |
| Server Actions | Authenticated merchant UI mutations where appropriate |
| RSC fetches | Server-side queries for dashboards |

## Conventions

- Version public APIs under `/api/v1/...` when externalized (`/api/health`, `/api/ready` unversioned OK)
- Zod validate inputs/outputs at boundary (library stance binding; dependency with first handlers)
- JSON wire **camelCase**; PostgreSQL/Drizzle **snake_case** — map at boundary, never leak DB names on wire
- Error shape (human `message` is **Persian**):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "اطلاعات ارسالی نامعتبر است.",
    "details": {},
    "correlationId": "uuid"
  }
}
```

- Prefer envelope Persian `message`; clients may also resolve stable `code` via `API_ERROR_MESSAGES_FA`
- Success: resource or `{ data, meta }`
- `Idempotency-Key` header required for sale complete & order create
- Propagate / generate `X-Correlation-Id` (see ADR-029 request boundary)

## Auth

- Bearer JWT or session cookie
- Public storefront endpoints unauthenticated but rate-limited (ADR-055)
- Admin endpoints require `platform_admin`
- **AuthZ** enforced in application layer (ADR-029 / ADR-034) — handlers do not soft-skip checks

## Security

- Never return OTP in production responses
- Rate limits: ADR-055
- API protection (ADR-077): Zod at boundary; CORS locked to app origins; public DTO output minimization (storefront ACL); Iranian phone PII mask/hash; soft-delete default exclude; CSRF via Server Actions + SameSite; encryption-at-rest deferred to infra; `Idempotency-Key` remains ADR-030

## Documentation

Each ARD documents its API contracts. Keep OpenAPI optional for MVP (Future Evolution) but endpoint tables mandatory in ARDs.
