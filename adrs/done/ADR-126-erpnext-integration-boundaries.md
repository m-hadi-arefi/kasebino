# ADR-126 — ERPNext Integration Boundaries (Prep)

| Field | Value |
| --- | --- |
| ID | ADR-126 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext accounting engine preparation (no live connection) |
## Folder

`adrs/done/` — contract + prep wiring landed 2026-08-09.

## Status

`Accepted` — Integration boundaries only. **No ERPNext install, API client, or credentials.** Tracking: `adrs/STATUS.md`. Docs: `docs/integrations/erpnext/`.

## Title

ERPNext Integration Boundaries — Ports, Mappings, Outbox Seam, Transactional Sale Integrity

## Context

MerchantOS is an Iranian-native retail OS (modular monolith) with POS, offline POS, storefront pickup, CRM, loyalty, catalog, and operational inventory. It does **not** own double-entry accounting. Future architecture uses ERPNext as the external ERP/accounting engine while MerchantOS remains the retail experience owner.

Today CompleteSale is multi-commit (membership / stock / loyalty / sale / outbox), risking partial local state. Inventory has no OLTP movement ledger. No vendor-neutral external ID mapping exists. Quantities are integers (piece-only); weight products are a future product requirement.

## Problem Statement

Without clean ownership, mapping, outbox seams, and local transactional integrity, ERPNext cannot be added later without rewriting POS, inventory, payments, and CRM.

## Goals

- Document domain ownership and source-of-truth rules.
- Add vendor-neutral `external_entity_mappings`.
- Add append-only `stock_movements` OLTP ledger (alongside `stock_items` balance).
- Introduce MerchantOS Quantity/UOM foundation (`products.base_unit_code`, `quantity_scale`) without migrating all qty columns to decimal.
- Introduce `AccountingProvider` port + Noop/Fake adapters (no ERPNext SDK).
- Harden CompleteSale into one PostgreSQL Unit of Work including outbox enqueue.
- Register `accounting_integration` outbox consumer with `processed_events` idempotency.
- Keep retail critical path independent of ERPNext availability.

## Non Goals

- Installing or running ERPNext; HTTP clients; auth; Docker; Doctype modeling in core.
- Replacing MerchantOS business logic with ERPNext.
- Full weight-product UX / global decimal qty migration.
- Purchasing/supplier OLTP implementation.
- Analytics as accounting source.
- Microservices, Kafka, event sourcing rewrite.

## Decision

1. **MerchantOS owns** merchants, stores, users/RBAC, catalog presentation, CRM/membership/loyalty, POS UX (incl. offline queue), storefront cart/checkout, operational inventory balances, notifications, analytics plane.
2. **ERPNext will own** CoA, GL, invoices (accounting docs), AR/AP, tax accounting, financial reports, accounting-side valuation — via a future adapter only.
3. **Shared domains** (Product, Customer, Order/Sale, Payment, Inventory, Store) sync through outbox events + external mappings; MerchantOS remains SoT for retail aggregates initially (M → E).
4. Core application depends on **`AccountingProvider`**, never ERPNext types.
5. Local success path: `BEGIN` → mutate OLTP (+ stock movements) → enqueue outbox → `COMMIT` → workers → `AccountingProvider`.
6. Offline POS continues: browser queue → MerchantOS API → PG/outbox → accounting worker. Never ERPNext from browser.
7. Credentials for ERPNext (future) are server/worker-only.

## Rationale

Ports + outbox already power SMS/PSP/MQTT. Accounting must follow the same pattern so ERPNext can be swapped in without touching CompleteSale. Local atomicity is a prerequisite; external sync must be at-least-once and idempotent.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| Call ERPNext sync inside CompleteSale TX | Couples retail latency to ERP; breaks offline independence |
| Put ERPNext IDs on product/customer columns | Couples schema to one vendor |
| Use Mongo analytics as accounting truth | Violates ADR-014/056; aggregates are not immutable docs |
| Full microservices split for ERP | Out of Phase-1 modular monolith scope |

## Consequences

- New OLTP tables/columns and an accounting module with Noop default.
- CompleteSale composition must share one Drizzle transaction.
- New outbox consumer must not sit on checkout critical path.
- Future `ERPNextAccountingProvider` lands under infrastructure ACL only.

## Technical Impact

- Schema: `external_entity_mappings`, `stock_movements`, `products.base_unit_code`, `products.quantity_scale`.
- Module: `src/modules/accounting/` (port, mappers, Noop/Fake).
- Shared: `src/shared/quantity/`.
- Composition + outbox worker wiring.
- Docs under `docs/integrations/erpnext/`.

## Domain Impact

Operational stock remains MerchantOS SoT for retail availability. Accounting valuation deferred to ERPNext. Product/Customer remain MerchantOS CRM/catalog entities with projected copies in ERPNext later.

## Analytics Impact

Accounting must never derive from Mongo warehouse aggregates. Warehouse may mirror integration metrics only.

## Security Impact

- No ERPNext credentials in browser/POS/customer app.
- Env placeholder `MOS_ACCOUNTING_PROVIDER=noop` only; no secrets in this phase.
- Integration logs scrub PII/secrets.

## Implementation Requirements

- [x] Docs set: README, domain-ownership, store-mapping, event-contracts, reconciliation, integration-boundary, implementation-plan
- [x] Drizzle Kit migration for mappings, movements, UOM columns
- [x] Quantity/UOM domain + tests
- [x] Stock movement writes on sale/pickup/adjust
- [x] AccountingProvider + Noop/Fake + mappers
- [x] CompleteSale UnitOfWork (membership+inventory+sale+loyalty+outbox)
- [x] Outbox consumer `accounting_integration` + metrics
- [x] Idempotent replay does not orphan outbox events
- [x] Tests: TX, idempotency, mapping, UOM, offline sync
- [x] validate: typecheck, lint, tests, build
- [x] No `erpnext` imports in core domain modules

## Dependencies

- ADR-009 POS/Sales, ADR-049 Inventory Sync, ADR-035/036/109 Outbox, ADR-012/102 Payments port pattern, ADR-015 Scope (accounting non-goal in-product), ADR-008 Catalog/Inventory, ADR-037 Event naming

## Related Documents

- `docs/integrations/erpnext/*`
- `PRD.md`, `AGENT.md`
- `docs/rules/iranian-first-development.md`

## Migration Plan

1. Expand/contract: add nullable/defaulted columns and new tables.
2. Backfill not required for mappings/movements (empty at deploy).
3. Default accounting provider = noop until a future ERPNext ADR.

## Testing Requirements

- CompleteSale success co-writes sale + stock + movement + outbox; failure rolls back.
- FakeAccountingProvider idempotent on repeated `eventId`.
- Mapping uniqueness both directions.
- Quantity conversion kg↔g; piece path unchanged.
- Offline duplicate syncKey.

## Iranian User Experience Requirements

- **Persian localization impact:** No new merchant UX screens in this ADR; integration docs may reference Persian retail terms (تومان display remains presentation-layer).
- **RTL requirements:** N/A (no UI).
- **Mobile usability impact:** Offline POS sync path unchanged.
- **Iranian business workflow impact:** Prepares IRR/rial money and future Iranian tax/accounting mapping without inventing Iranian tax rules yet.

## Completion Criteria

- [x] Iranian First checklist N/A (no UX) — noted
- [x] Implementation requirements checked
- [x] STATUS / progress-log updated
- [x] ADR moved to `adrs/done/` after green validate
