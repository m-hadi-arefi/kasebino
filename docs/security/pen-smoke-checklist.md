# Pen-smoke checklist — MerchantOS MVP (ADR-119 / ARD-020)

Smoke security checks for staging-readiness. **Not** a full paid pentest.

Fill the **Last run** section when re-running after auth/security changes.

---

## Checklist

| # | Check | How | Pass criteria |
| --- | --- | --- | --- |
| 1 | Security headers on HTML | `curl -I https://<host>/login` (or local) | CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` present |
| 2 | Security headers on API | `curl -I https://<host>/api/v1/...` | Same headers (middleware) |
| 3 | HSTS in staging/prod | Headers when `MOS_ENV=staging\|production` | `Strict-Transport-Security` present |
| 4 | CORS deny unknown origin | `Origin: https://evil.example` on `/api/v1/*` | No `Access-Control-Allow-Origin: *`; request denied / no credentialed echo |
| 5 | CORS allow allowlisted origin | `Origin` in `CORS_ALLOWED_ORIGINS` | ACAO echoes origin + credentials |
| 6 | CSRF mutation without token | `POST /api/v1/pos/sales` with session cookie, no `x-csrf-token` | `403` + Persian `CSRF_REJECTED` |
| 7 | CSRF mutation with token | Matching `mos.csrf` cookie + `x-csrf-token` header | Not rejected for CSRF |
| 8 | Realtime header-only identity | `POST /api/v1/realtime/token` with only `x-merchant-id`, no session | `401` |
| 9 | Staging OTP non-leak | `POST` OTP request with `MOS_ENV=staging` / `NODE_ENV=staging` | JSON body has **no** `devOtp` |
| 10 | Console SMS not default outside local | SMS factory with staging/prod env | Console adapter refused / not selected |
| 11 | Admin routes | Unauthenticated `/admin` and admin API | Redirect / `401`/`403` (not open) |
| 12 | Merchant protected surfaces | Unauthenticated `/dashboard`, `/pos` | Redirect to Persian login |

---

## Last run

| Field | Value |
| --- | --- |
| Date | 2026-08-05 |
| Environment | Local contracts + unit/integration evidence (Vitest); staging curl deferred until staging host |
| Runner | `npm run validate` (typecheck + lint + test) after ADR-119 wiring |
| Build / commit | Uncommitted ADR-119 worktree (do not treat as release sign-off) |

### Results

| # | Result | Evidence |
| --- | --- | --- |
| 1 | PASS (automated) | `buildSecurityHeaders` + `next.config` / middleware wiring; `src/infrastructure/security/index.test.ts` |
| 2 | PASS (automated) | Same as #1 — headers applied in middleware for all matched routes including `/api/*` |
| 3 | PASS (automated) | HSTS asserted for `mosEnv=staging`; absent for local |
| 4 | PASS (automated) | `resolveCorsAllowedOrigins` / `isOriginAllowed` deny unknown origin |
| 5 | PASS (automated) | Allowlist includes env origins + localhost defaults |
| 6 | PASS (automated) | `validateCsrfDoubleSubmit` missing → fail + Persian message; middleware enforces on mutating `/api/v1` |
| 7 | PASS (automated) | Matching cookie+header → ok |
| 8 | PASS (automated) | `src/realtime-client/index.test.ts` header-only → 401; route session-only authorizer |
| 9 | PASS (automated) | `shouldReturnDevOtp("staging")===false`; auth OTP HTTP staging omits `devOtp` (`src/infrastructure/auth/index.test.ts`, merchant/customer auth tests) |
| 10 | PASS (automated) | `assertConsoleSmsAllowed` / SMS factory local-only (`src/infrastructure/auth`) |
| 11 | PASS (partial) | Middleware session gate + ADR-113 admin AuthZ tests; live staging curl not run this cycle |
| 12 | PASS (partial) | Middleware merchant gates; live staging curl not run this cycle |

### Notes / follow-ups

- Outbox max-retry **DLQ persistence** remains owned by **ADR-109** (coordinate only; not verified here).
- Re-run live staging curl rows (#1–12 against deployed URL) before public staging launch.
- Tighten CSP with nonces when Next script strategy allows removing `'unsafe-inline'` / `'unsafe-eval'`.

### Sign-off

| Role | Name | Status |
| --- | --- | --- |
| Implementer | ard-to-code / ADR-119 | Automated rows green; live staging curl pending deploy |
| Reviewer | — | Pending human staging smoke |
