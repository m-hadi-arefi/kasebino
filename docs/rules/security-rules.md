# Security Rules

1. HTTPS only in staging/prod.
2. Zod validate all external inputs.
3. Rate limit auth/OTP routes as specified.
4. Tenant isolation tests mandatory for each new resource.
5. Audit sensitive mutations.
6. Never log OTP or raw tokens.
7. CSRF/XSS protections preserved when using cookies (Server Actions + SameSite; ADR-077).
8. Iranian phone is PII — mask/hash in logs/telemetry; never on public storefront DTOs (ADR-077).
9. Encryption-at-rest is infra (volume/managed PG); do not invent app field encryption without a superseding ADR.
