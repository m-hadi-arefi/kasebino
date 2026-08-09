# ADR-134 - ERPNext UI Strategy

| Field | Value |
| --- | --- |
| ID | ADR-134 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext architecture research |
| Folder | `adrs/done/` - architecture contract (docs) landed 2026-08-09 |

## Status

`Accepted` - Architecture contract. Detail: `docs/integrations/erpnext/ui-strategy.md`.

## Title

ERPNext UI Strategy - Retail UI vs Accountant Desk

## Context

ERPNext Desk is powerful for finance/procurement. MerchantOS must ship Iranian First retail UX (ADR-021) across POS, storefront, and merchant dashboards.

## Problem Statement

Embedding or replacing MOS UI with ERPNext would destroy offline POS, store-first PWAs, and Iranian UX governance.

## Goals

Partition UI ownership and forbid Desk-as-product-shell.

## Non Goals

Implementing deep-link SSO; redesigning ERP Desk.

## Decision

1. **MerchantOS UI** remains the interface for cashiers, merchants (ops/retention), customers, and Kasbino admin.
2. **ERPNext Desk UI** remains the interface for accountants, buyers, and ledger configuration.
3. **Do not** replace POS, storefront, customer app, or merchant dashboard with ERPNext screens.
4. **Do not** use ERPNext Website/CMS as the merchant storefront or blog default.
5. Optional future: "Open in ERPNext" deep links for finance users - never required for selling.
6. iframe embedding of Desk inside MOS is discouraged.

## Rationale

Different jobs-to-be-done, availability requirements, and UX laws. Boundary matches domain ownership.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| Desk-only for merchants | Unusable for Iranian counter retail |
| Rebuild all financial screens in MOS | Violates ADR-133 |
| ERP Website as PWA | Wrong tenancy/UX |

## Consequences

uiuxpromax applies to MOS surfaces only. Finance training happens in ERPNext.

## Implementation Requirements

- [x] `ui-strategy.md` + website CMS decision doc
- [x] AGENT.md ERPNext Architecture Context section

## Dependencies

ADR-021, ADR-022, ADR-023, ADR-127, ADR-128, ADR-133

## Related Documents

`docs/integrations/erpnext/ui-strategy.md`

## Migration Plan

None.

## Testing Requirements

N/A (no UI change).

## Iranian User Experience Requirements

Reinforces that Persian RTL retail UX stays in MOS design system.

## Completion Criteria

- [x] UI partition accepted and documented
