# ERPNext Integration Roadmap

Status: architecture preparation. **No live ERPNext connection until Foundation + Adapter phases complete.**

## Phase 1 — Preparation (current)

- ADRs for boundaries, ownership, sync, mappings, UI, accounting, inventory
- Knowledge base under `docs/integrations/erpnext/`
- Agent / product documentation updated
- ADR-126 seams already landed: `AccountingProvider`, mappings table, stock movements, CompleteSale UoW, outbox consumer

**Exit criteria:** Any agent can explain SoT and forbidden couplings without reading ERPNext marketing pages.

## Phase 2 — Foundation (MerchantOS-only hardening)

- Expand external entity mapping coverage & entity_type taxonomy
- Harden stock ledger invariants + UOM conversions for weight SKUs
- Complete event payloads for Product/Customer/Sale/Payment/Stock
- FakeAccountingProvider scenario suite as contract tests
- Optional: merchant-level feature flag for “accounting sync enabled”
- Define Iran currency presentation vs IRR minor units in sync DTOs
- Draft reconciliation job design (no ERP calls yet)

**Exit criteria:** Contract tests green; noop/fake paths production-safe.

## Phase 3 — ERPNext adapter (still behind port)

- Provision ERPNext site (ops), Company/Warehouse conventions
- Dedicated integration User + token auth
- `ERPNextAccountingProvider` under `infrastructure/providers/erpnext/` only
- REST client: create/submit Sales Invoice, upsert Item/Customer, Payment Entry
- Idempotent mapping writes; retry + DLQ unchanged
- Staging soak with Fake vs ERPNext dual-run comparison tools
- Security review: secrets, least privilege, log scrubbing

**Exit criteria:** One pilot merchant can sync sales without cashier impact.

## Phase 4 — Production integration

- Reconciliation worker + ops runbooks
- Monitoring/alerts on `integration.event.*` metrics
- Optional E→M: purchase receipt → MOS stock; AR balance read ACL
- Accountant deep-links; merchant “sync health” panel (Persian/RTL)
- Document Iran tax template configuration in ERP (not MOS tax engine)
- Load & failure drills (ERP downtime)

**Exit criteria:** SLA on eventual consistency; DLQ operable; financial reports trusted in ERP Desk.

## Explicitly deferred

- Replacing MOS loyalty with ERPNext Loyalty Program
- ERPNext Website/CMS as storefront
- Shared DB / change-data-capture pipelines
- Building GL editor inside MerchantOS

## Suggested ADR sequencing for later implementation

1. Keep ADR-127…134 as binding architecture contracts
2. Future **ERPNext Runtime Adapter** ADR unlocks Phase 3 code
3. Future **Reconciliation Runtime** ADR unlocks Phase 4 jobs
