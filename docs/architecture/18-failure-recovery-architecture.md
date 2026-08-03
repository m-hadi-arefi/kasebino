# 18 — Failure Recovery Architecture

## Principles

1. Prefer fail-safe POS: after DB commit, async side effects retry
2. Idempotency keys prevent double sales/orders
3. Outbox guarantees event durability
4. Circuit-break SMS/PSP adapters with clear user errors

## Failure modes

| Failure | Detection | Recovery |
| --- | --- | --- |
| Postgres down | ready probe fail | LB drain; no writes |
| Redis down | errors / ready degraded | Bypass cache → DB (degraded), fail closed on rate-limit for auth if policy requires |
| EMQX down | publish errors | Outbox retry; poll fallback |
| SMS provider down | send errors | User message; allow admin/dev diagnostics |
| Partial sale orchestration | TX rollback | No events; safe retry |
| Duplicate client submit | Idempotency-Key | Return original result |
| Offline queue conflict | Sync 409 | Merchant review UI |

## Dead letter

Failed outbox deliveries after max retries → `outbox_dead_letters` with alert metric.

## Runbooks

Deployment docs must include restart order: postgres → redis → emqx → minio → app.
