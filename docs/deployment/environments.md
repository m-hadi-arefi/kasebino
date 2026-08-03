# Environments

| Env | SMS | Data | Notes |
| --- | --- | --- | --- |
| development | OTP in API | Compose | Fast iteration |
| staging | Provider sandbox/mock | Prod-like | QA |
| production | Real SMS | HA | Multi-instance |

## Secret management (ADR-068)

- Commit **`.env.example` only** — never commit `.env` or real credentials.
- Inject secrets via process env or a secret manager at deploy time.
- Required boot keys: `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`.
- `AUTH_SECRET` is dedicated for session/JWT signing — do **not** reuse Postgres/Redis/MinIO passwords.
- Production/staging: fail-fast when required keys are missing; placeholder `AUTH_SECRET` values are rejected.
- Contract + zod-free `parseEnv`: `src/env-secrets/`.
- Merchant-visible config failures at the edge use Persian copy from the contract.
- Vault/SOPS and SMS/PSP provider secrets: later (see ADR-068 Future Evolution, ADR-083/084).

Rotation: rotate `AUTH_SECRET` and data-plane passwords per environment without committing new values to git; roll instances after injection.
