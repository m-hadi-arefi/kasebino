# ERPNext ADRs — Implementation Execution Plan

Date: 2026-08-09  
Scope: Gap-fill / harden foundations (no ERPNext client, install, or credentials).

## Audit summary (ADRs vs code)

| ADR / Theme | Decision | Current code | Gap |
| --- | --- | --- | --- |
| ADR-126/127 Boundary | Port + ACL only | `src/modules/accounting/` + Noop/Fake | Minor: document readiness; keep structure |
| External mappings | Vendor-neutral table + repo | schema `0004` + Drizzle/InMemory repos | Harden InMemory unique-external; tests |
| CompleteSale UoW | Single PG TX for OLTP | `txScope.run` wraps **entire** completeSale | **MinIO inside TX** — must move IO out |
| Outbox accounting | `accounting_integration` consumer | Worker + handler wired | Handle `MembershipCreated`; enrich sale lines |
| Stock movements | Append-only ledger | `stock_movements` + append on mutate | Sufficient (lowercase reasons) |
| Quantity/UOM | Foundation without decimal migration | `src/shared/quantity` | Add serialize helpers |
| Product/Customer mappers | Provider-neutral | `application/mappers` | Payment mapper + membership→customer |
| Payment boundary | Accounting consequence ≠ gateway | Port `recordPayment` | Explicit mapper + docs |
| UI / Accounting strategy | Docs only | Agent/PRD updated | Keep; no Desk coupling |

## Implementation order

1. Integration foundation validation (plan + readiness tests)
2. External mapping hardening
3. Quantity serialize helpers
4. CompleteSale OLTP-only UnitOfWork (MinIO/analytics outside)
5. SaleCompleted payload lines
6. Outbox: MembershipCreated → syncCustomer; payment mapper
7. Tests: TX mock, rollback, idempotency, mapping, UOM
8. Docs + STATUS/progress-log

## Database migrations

No new migration required if `0004_skinny_mandroid.sql` already applied (mappings, movements, UOM columns).  
New schema changes would only be needed for decimal qty — **out of scope**.

## Modules affected

- `src/modules/pos/application/use-cases.ts` (+ ports, events)
- `src/infrastructure/composition/create-api-context.ts`
- `src/modules/accounting/**`
- `src/shared/quantity/**`
- `src/modules/accounting/infrastructure/persistence/external-entity-mapping-repository.ts`
- Tests under accounting / inventory / pos / quantity

## Test strategy

- Unit: UoW mock (external calls after commit), Fake provider idempotency, mapping uniqueness, UOM conversion/serialize
- Module: CompleteSale outbox + movements; MembershipCreated accounting path
- Guard: no `erpnext`/`frappe` imports in modules
- Validate: `typecheck`, `lint`, `test`, `build`

## Rollback strategy

- Code-only changes; revert commit(s) if needed
- No destructive migration
- `MOS_ACCOUNTING_PROVIDER=noop` remains default

## Explicit non-goals (this pass)

- ERPNext install / REST client / credentials
- Kafka / microservices
- Decimal qty column migration
- Replacing MerchantOS UI
