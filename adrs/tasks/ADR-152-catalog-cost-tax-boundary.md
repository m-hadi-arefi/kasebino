# ADR-152: Catalog Cost and Tax Presentation Boundary

| Field | Value |
| --- | --- |
| ID | ADR-152 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #14 |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

Products have sell price only. Cost/tax missing in MOS catalog. ERPNext is financial brain — tax books should not be reinvented — but merchants still need either (a) operational cost fields for margin hints or (b) explicit UX that cost/tax live in ERP.

## Current State

- `products.price_amount_minor` only
- No tax lines on sales/orders
- ERP projectors do not send tax (`docs/audit` accounting matrix)
- Finance UI does not configure Item Tax Templates

## Decision

Clarify boundary:

1. **MVP-A (recommended):** Add optional `costAmountMinor` on products for merchant margin hints only (not GL). Document tax as ERPNext-owned; do not compute tax in POS MVP.
2. **MVP-B (if product requires tax on receipts):** Separate follow-up after tax template mapping in ERP adapter — out of this ADR’s default path.

This ADR implements **MVP-A** + Persian UX copy on finance/settings pointing tax → ERP.

## Scope

Included:

- Optional cost field + UI
- Docs boundary note in PRD/integrations
- Explicit “no tax in MOS POS” acceptance

Excluded:

- Full Iranian VAT engine in MOS
- Tax lines on Sales Invoice projectors (ERPNext config / later ADR)
- COGS automation

## Technical Design

### Database

- `products.cost_amount_minor` nullable bigint

### Backend / Frontend

- Product form cost field تومان
- Never treat cost as accounting SoT

## Implementation Plan

1. Migration + UC.
2. UI.
3. Docs.

## Data Model Changes

Tables: `products` alter  
Fields: `cost_amount_minor`  
Indexes: none

## API Changes

Product create/update/get include optional cost

## Frontend Changes

Product form; optional POS not showing cost to cashier

## Testing Requirements

Unit validation ≥0; money minor units

## Acceptance Criteria

- [ ] Cost optional and persisted
- [ ] Docs state tax books owned by ERPNext
- [ ] No fake tax on MOS receipts

## Dependencies

None hard; synergy ADR-146 ERP config

## Migration / Rollout Plan

Additive column.
