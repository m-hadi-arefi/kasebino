# ADR-133 - ERPNext Accounting Strategy

| Field | Value |
| --- | --- |
| ID | ADR-133 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext architecture research |
| Folder | `adrs/done/` - architecture contract (docs) landed 2026-08-09 |

## Status

`Accepted` - Architecture contract. Aligns with PRD non-goals and ADR-015.

## Title

ERPNext Accounting Strategy - MerchantOS Does Not Own the Books

## Context

PRD states MerchantOS is not accounting software. ERPNext Accounting module is a full double-entry engine integrated with selling/buying/stock.

## Problem Statement

Pressure to "just add journals in Postgres" would fork financial truth and create compliance risk.

## Goals

Freeze what MOS must never implement and what ERP owns.

## Non Goals

Configuring Iranian tax templates in detail; building report embeds.

## Decision

### MerchantOS does NOT implement

- General Ledger / `GL Entry` equivalents as SoT
- Journal Entry UX/engine
- Tax accounting / filing engines
- Accounts Receivable / Payable subledgers as SoT
- Period closing / fiscal year controls
- Statutory financial statements as system of record

### ERPNext owns

- Chart of Accounts
- Journals, invoices, payment entries
- Tax templates and tax GL posting
- A/R, A/P, aging
- Financial reports (TB, P&L, BS, etc.)
- Perpetual inventory accounting entries

### MerchantOS may

- Orchestrate money capture (PSP) and emit accounting events
- Show operational KPIs and retention analytics
- Later display **read-only** ERP figures via ACL (clearly labeled)

### Money model

Sync DTOs use IRR minor units as today; ERP Company currency configuration is ops-owned. Toman is presentation in MOS UI only.

## Rationale

Avoid rebuilding ERP; keep compliance in a mature ledger; honor product scope.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| Lightweight GL in MOS | Inevitable incomplete double-entry |
| Outsource to non-ERPNext SaaS only | Still need boundary; ERPNext chosen direction |

## Consequences

Accountant users use ERP Desk. MOS support must not "fix balance" in OLTP.

## Implementation Requirements

- [x] Document in `erpnext-accounting.md` + PRD vision section
- [ ] Adapter postings (deferred)

## Dependencies

ADR-015, ADR-012, ADR-126, ADR-128, ADR-129

## Related Documents

`docs/integrations/erpnext/erpnext-accounting.md`

## Migration Plan

None.

## Testing Requirements

No GL tables added to Drizzle schema.

## Iranian User Experience Requirements

Future finance deep-links may be Persian-labeled in MOS chrome; Desk language is ops-configured.

## Completion Criteria

- [x] Non-implementation list accepted
