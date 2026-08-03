# 06 — Security Architecture

**ADR:** ADR-076 (`src/security-architecture` contract).  
**Rules:** `docs/rules/security-rules.md`.  
**Rate limits:** ADR-055 (`src/rate-limiting`). **API protection:** ADR-077 (`src/api-protection`) — boundary Zod stance, public DTO ACL, Iranian phone PII, CORS lock, CSRF/server-actions, soft-delete defaults; encryption-at-rest deferred to infra. **Still deferred:** audit wire → ADR-058; pen smoke / header middleware → ARD-020; Next.js route matrix attachment remains caller-side.

## Controls map

| Threat | Control |
| --- | --- |
| Credential stuffing / OTP spam | Redis rate limits; OTP attempt caps |
| Session theft | Secure cookies, HTTPS, short JWT TTL + refresh/rotation |
| XSS | React escaping, CSP, no unsanitized HTML |
| CSRF | Next.js server action protections + SameSite cookies |
| SQLi | Drizzle parameterized queries only (no string-concat SQL; no alternate ORMs) |
| IDOR / tenant leak | merchantId guard on all repos |
| Inventory fraud | Audit logs; admin monitoring hooks |
| SSRF via uploads | MinIO signed URLs; type/size validation |

## AuthN / AuthZ

- AuthN: phone OTP → JWT via NextAuth JWT strategy
- AuthZ: RBAC at application service boundary (`src/rbac`, ADR-034)
  - `merchant_owner`: full merchant scope (aliases: `owner`)
  - `store_employee`: POS/CRM/loyalty ops; no billing/settings destructive ops unless granted (aliases: `staff` / `manager` / `cashier`)
  - `customer`: self-service only; never staff permissions
  - `platform_admin`: admin panel only; cross-tenant requires audited action (ADR-048)
  - Every query/mutation tenant (and store when employee-scoped) checked; Persian deny messages
- Sensitive auth events feed AuditPort + security monitoring when ARD-022/026 available (non-blocking)
- AuthZ deny metric: `authz.deny` (reason/permission/role) — emit via observability port when wired

## Secrets

- Env-only secrets; never commit
- Separate secrets per environment
- SMS API keys, JWT secret, DB URL, `MONGODB_URI`, Redis URL, MinIO keys, EMQX creds

## Validation

All external inputs validated with Zod at API boundary before use cases. Public responses use storefront ACL DTOs (no cost/PII/internal fields). See ADR-077 `src/api-protection`.

## Audit

Sensitive mutations write insert-only audit records (Mongo long-term via ARD-022; optional thin PG): actor, action, entity, before/after summary, IP, correlationId. See `audit-architecture.md`.

## Security DoD for ARDs

- AuthZ tests
- Rate limit where specified
- No secrets in logs
- Soft-deleted records not listed by default
