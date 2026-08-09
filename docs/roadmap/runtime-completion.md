# Runtime completion roadmap

Generated from [`docs/audit/`](../audit/) + [`adrs/tasks/`](../../adrs/tasks/).

Canonical order: [`docs/architecture/adr-execution-order.md`](../architecture/adr-execution-order.md).

## Goal

Move MerchantOS from “MVP journeys mostly wired + stubs in critical seams” to “production-ready Iranian retail pilot” (real SMS, real PSP optional per phase, stock-correct online orders, trustworthy ERP finance, multi-staff RBAC, deployable ops).

## What is already done (do not re-ADR)

Persistence, composition root, `/api/v1`, OTP auth, RBAC enforcement, POS+offline, catalog/inventory merchant UI, CRM, loyalty POS earn, storefront pickup, sandbox payments, Redis/MinIO/Mongo/outbox/EMQX runtimes, ERPNext adapter+finance UI foundations.

See `adrs/tasks/README.md` “Do not recreate”.

## Work packages

| Package | ADRs | Est. |
| --- | --- | --- |
| Stock correctness | 142, 151, 148 | M |
| ERP trust | 146 (+ close 135–141) | M |
| Staff & auth ops | 144, 115 | L+M |
| Real money | 143 | L |
| Retention polish | 145, 147, 149, 152 | M |
| Quality & ship | 117, 150, 116, 118 | L |

## Definition of done (pilot)

- [ ] Online paid order decrements stock; cancel restores
- [ ] Production boot rejects inventory stubs + Fake finance
- [ ] Staging ERPNext shows Sales Invoice for CompleteSale
- [ ] Finance UI never shows unlabeled fake zeros
- [ ] Owner can invite cashier; finance denied
- [ ] Production SMS OTP (ADR-083 Accepted)
- [ ] PSP path ready (ADR-084 Accepted) or explicit pilot=cash/sandbox staging only
- [ ] Playwright money smoke in CI with Postgres
- [ ] Backups + staging deploy runbook (118)
