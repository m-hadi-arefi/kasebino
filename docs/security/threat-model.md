# Threat Model (MVP)

| Asset | Threat | Control |
| --- | --- | --- |
| Auth | OTP brute force | Rate limit, attempt cap |
| JWT | Theft | httpOnly secure cookie, short TTL, tokenVersion |
| Tenant data | IDOR | merchantId guards + tests |
| Sales | Double submit | Idempotency-Key |
| PII phone | Leakage in logs | Scrubbing policy |
| Payments | Forged webhooks | Signature verify |
| Admin | Privilege abuse | RBAC + audit |

Detailed controls: `docs/architecture/06-security-architecture.md`.
