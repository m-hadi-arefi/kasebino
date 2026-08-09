# ADR-146: ERPNext Dual-Run Soak and Honest Finance Reads

| Field | Value |
| --- | --- |
| ID | ADR-146 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Critical #4 + High #7; complements ADR-135…141 |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

ErpNextAccountingProvider, Docker, sync records, and finance UI exist, but default provider is **noop**, dual-run soak is unproven, and live finance reader hardcodes receivables/payables to `"0"` with `profitOverview: null` while aliasing todaySales=monthRevenue — merchants can misread Fake/zero books as truth.

## Current State

- Provider: `src/modules/accounting/infrastructure/providers/erpnext/*`
- Factory default noop: `.env.example` `MOS_ACCOUNTING_PROVIDER=noop`
- Sync: `erpnext_sync_records`, `/finance/sync`
- Reader: `erpnext-finance-reader.ts` L78–82 zeros/null
- Fake reader used when `MOS_ENV=local` typical
- ADRs 135–141 in `tasks/` (governance lag vs landed adapter/UI code)
- Docs: `docs/integrations/erpnext/readiness-report.md` score 62/100

## Decision

1. Run and document mandatory dual-run soak (CompleteSale → Sales Invoice + Payment Entry as applicable).
2. Make finance UI **honest**: never show invented Fake KPIs as if live; hide or mark «در دسترس نیست» until ERP reports wired.
3. Add failed-sync manual retry API + UX.
4. Optionally compute AR from open Sales Invoices when ERP configured — else omit tiles.

## Scope

Included:

- Soak runbook automation notes + bootstrap hardening
- Finance reader honesty + KPI availability flags
- `POST /api/v1/erpnext/finance/sync/{id}/retry` (or resync by saleId)
- Persian UX for unavailable metrics
- Staging checklist in readiness-report

Excluded:

- Purchasing/AP phases (future)
- Full P&amp;L/BS/CF native rebuild
- Embedding ERPNext Desk

## Technical Design

### Backend

- Extend `ErpNextFinanceReader` to either fetch receivable report or return `available: false` per KPI.
- `FakeFinanceReader` forbidden when `MOS_ACCOUNTING_PROVIDER=erpnext` or `MOS_ENV=production`.
- Retry: re-enqueue outbox or re-invoke provider with original event payload from sync record metadata if stored; else “retry last failure” by mapping id.

### Frontend

- Dashboard tiles show dash + helper text when unavailable.
- Sync page: Retry button for `failed` rows.

### Infrastructure

- Document: Wizard IRR → `npm run erpnext:bootstrap` → env → migrate → worker.

## Implementation Plan

1. KPI availability model in finance-types.
2. Reader + UI honesty.
3. Retry endpoint + tests.
4. Execute soak; file defects against projectors if found.
5. Update readiness score honestly.

## Data Model Changes

Tables: none required (may add `last_payload_json` on sync records if retry needs it)  
Fields: optional  
Indexes: existing sync indexes  

## API Changes

Routes:

- `POST /api/v1/erpnext/finance/sync/retry` body `{ syncRecordId }`
- Dashboard response includes `kpis[].status: available|unavailable`

## Frontend Changes

Pages: `/finance`, `/finance/sync`  
Components: KPI empty states Persian  
User flows: failed sync → retry → synced

## Testing Requirements

Unit: unavailable KPIs; retry idempotency  
Integration: mocked ERP HTTP  
Manual/E2E staging: live Desk invoice assert

## Acceptance Criteria

- [ ] Local Fake cannot be mistaken for live when provider=erpnext
- [ ] Unavailable KPIs do not render as 0 تومان without label
- [ ] Failed sync retry works for at least SaleCompleted path
- [ ] Documented soak: one CompleteSale appears as Sales Invoice in Desk
- [ ] Readiness report updated with evidence links

## Dependencies

Required before: ADR-140/141 code paths (adapter + ACL)  
Depends on: worker running, ERPNext site created  
Human: Setup Wizard Company IRR

## Migration / Rollout Plan

1. Honesty UI first (safe).
2. Staging soak.
3. Pilot store `MOS_ACCOUNTING_PROVIDER=erpnext`.
