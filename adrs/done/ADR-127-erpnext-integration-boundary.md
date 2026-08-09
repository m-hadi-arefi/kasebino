# ADR-127 - ERPNext Integration Boundary

| Field | Value |
| --- | --- |
| ID | ADR-127 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext architecture research (docs only) |
| Folder | `adrs/done/` - architecture contract (docs) landed 2026-08-09 |

## Status

`Accepted` - Architecture contract. Extends ADR-126. **No ERPNext HTTP client, install, or credentials.** Docs: `docs/integrations/erpnext/`.

## Title

ERPNext Integration Boundary - External Engine, Retail Platform Independence

## Context

MerchantOS is an Iranian-native retail OS. ERPNext is a full ERP on Frappe with DocTypes, ledgers, and Desk UI. Without a hard boundary, agents will import ERP concepts into POS/CRM or replace MOS UX with Desk.

ADR-126 landed ports/mappings/outbox seams. This ADR freezes the long-term boundary rule set for all future adapter work.

## Problem Statement

Teams need an unambiguous rule: ERPNext is external; MerchantOS remains the retail platform; core domains must not couple to Frappe/ERPNext.

## Goals

- Declare ERPNext as external ERP/accounting engine.
- Keep MerchantOS as retail experience platform.
- Forbid ERPNext concepts inside core domain modules.
- Point implementers at ACL + outbox only.

## Non Goals

- Implementing `ERPNextAccountingProvider`.
- Running ERPNext in Docker Compose for this ADR.
- Changing POS/CRM product scope.

## Decision

1. **ERPNext is an external system** reached only through `AccountingProvider` (and future read ACLs).
2. **MerchantOS remains the retail experience platform** (POS, storefront, CRM, loyalty, operational inventory).
3. **Core domains do not import ERPNext concepts** - no DocType names in domain events, no Frappe types in aggregates, no SDK in `application`/`domain` layers.
4. Future adapter code lives only under infrastructure ACL (e.g. `src/modules/accounting/infrastructure/providers/erpnext/`).
5. ADR-126 technical seams remain the integration spine.

## Rationale

Ports already isolate SMS/PSP. Accounting must follow the same anti-corruption pattern so ERPNext versioning, naming series, and Desk workflows cannot leak into CompleteSale.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| Call ERPNext inside use-case TX | Couples retail latency/availability to ERP |
| Shared database | Violates tenancy, migrations, SoT |
| Replace MOS modules with ERPNext | Contradicts PRD retention focus |

## Consequences

- Future agents must read `docs/integrations/erpnext/` before proposing ERP features.
- New sync capabilities extend the port; they do not bypass it.

## Technical Impact

Documentation + ADR governance only (runtime unchanged from ADR-126).

## Domain Impact

Bounded contexts stay as ADR-003; accounting context remains a provider facade.

## Analytics Impact

Mongo analytics never becomes accounting SoT.

## Security Impact

Credentials server/worker only - see `erpnext-security.md`.

## Implementation Requirements

- [x] Knowledge base + boundary docs under `docs/integrations/erpnext/`
- [x] Agent/product docs reference boundary rules
- [ ] No ERPNext runtime adapter (explicitly deferred)

## Dependencies

ADR-126, ADR-003, ADR-004, ADR-015, ADR-036

## Related Documents

`docs/integrations/erpnext/README.md`, `integration-boundary.md`, `domain-boundary-analysis.md`

## Migration Plan

None (docs/contract).

## Testing Requirements

Guard existing tests: no `erpnext` imports under domain modules.

## Iranian User Experience Requirements

N/A (no UI). Boundary preserves Iranian POS/storefront ownership.

## Completion Criteria

- [x] Docs published
- [x] ADR accepted and STATUS updated
- [x] No live ERPNext dependency introduced
