# Domain Boundary Analysis — MerchantOS vs ERPNext

Analysis date: 2026-08-09  
Codebase refs: `src/modules/*`, ADR-003/008/009/012/015/049/126, `docs/integrations/erpnext/*`.

## Current MerchantOS modules (OLTP)

| Module | Responsibility today |
| --- | --- |
| identity / customer-identity | Staff + customer OTP auth |
| merchant / store | Multi-tenant merchant & store branding |
| catalog | Products, SKU, barcode, presentation |
| inventory | `stock_items` balances + `stock_movements` ledger |
| pos | Sale aggregate, tender, offline sync |
| ordering / storefront | Pickup cart, OrderPaid lifecycle |
| crm | StoreMembership profiles |
| loyalty | Points wallet/ledger |
| payments | PaymentIntent + PSP port |
| accounting | `AccountingProvider` port + Noop/Fake (ADR-126) |
| analytics / notifications | Secondary planes |

ERPNext is **not** a dependency. Preparation seams already exist (outbox consumer `accounting_integration`, external mappings).

## Decision table

| Capability | Owner | Reason | Sync Direction |
| --- | --- | --- | --- |
| POS UX (online) | MerchantOS | Core Iranian retail experience; ADR-009/096 | M → E (sale docs) |
| Offline POS queue | MerchantOS | Unique capability; must not call ERP from browser | M → E after sync |
| Storefront / Store PWA | MerchantOS | Store-first product; pickup-only | M → E (orders as sales) |
| Customer OTP portal | MerchantOS | Engagement UX | M → E (customer projection) |
| CRM membership & segments | MerchantOS | Retention SoT; phone identity | M → E |
| Loyalty points | MerchantOS | Product differentiator; not GL | — (local) |
| Catalog UX / barcode search | MerchantOS | Commerce experience | M → E (Item) |
| Operational inventory qty | MerchantOS | Availability for sell/pickup | M → E (movements) |
| Inventory valuation / COGS | ERPNext | Perpetual inventory + GL | E (books); movements from M |
| Accounting / CoA / Journal | ERPNext | Complex financial engine; PRD non-goal for MOS | E |
| Tax accounting / filing | ERPNext | Specialized; Iran rules deferred to ERP config | E |
| A/R & A/P outstanding | ERPNext | Financial truth | E → M (read later) |
| Financial reports (BS/P&L) | ERPNext | Ledger SoT | E → M reports ACL later |
| Purchase / Supplier | ERPNext | Mature domain; PRD excludes supplier networks | E (optional E→M stock later) |
| Payment capture (PSP) | MerchantOS + PSP | Gateway confirms money | M → E (Payment Entry) |
| Payment GL posting | ERPNext | Accounting consequence | via M event |
| Product master (commerce) | MerchantOS | Selling UX SoT | M → E |
| Item financial defaults | ERPNext | Income/expense/warehouse accounts on Item | configured in E; mapped from M |
| Merchant / Store identity | MerchantOS | Tenancy SoT | M → E (Company/Warehouse) |
| Blog / CMS | MerchantOS decision: **out of ERP** | Commodity; Desk Website unfit for store PWA | — |
| ERPNext Desk UI | ERPNext | Accountant / buyer operators | Human users in Desk |
| Merchant dashboard simple KPIs | MerchantOS | Retention & ops analytics (Mongo/OLTP) | Not accounting truth |
| Notifications / SMS | MerchantOS | Iranian channels | — |

## Justifications (selected)

### Why POS stays in MerchantOS

Counter latency, Persian RTL cashier UX, barcode camera flows, and offline queue are product-defining. ERPNext POS is Desk-oriented and cannot host MOS membership/loyalty capture.

### Why accounting stays in ERPNext

Double-entry, fiscal periods, tax templates, and perpetual inventory valuation are deep domains. Rebuilding them violates PRD non-goals and ADR-015 scope guardrails.

### Why inventory is split

Retail must sell using local `stock_items` even if ERP is down. Valuation and COGS need ERP ledgers. MOS therefore owns **operational quantity**; ERP owns **financial stock value** after sync.

### Why purchase is ERP-first

No MOS purchase aggregate exists; adding one now creates dual SoT before reconciliation exists. ERP Buying already covers RFQ→PO→Receipt→PI.

### Why CMS is not ERP Website

Storefront is a multi-tenant installable PWA with pickup checkout — already specified in ADR-023/086/100. ERP Website is the wrong tenancy and UX layer.

## Conflict policy summary

1. Identity keys always MOS UUIDs; ERP `name` only in mapping table.
2. Retail price conflicts → MOS wins operations.
3. Outstanding balance conflicts → ERP wins finance.
4. Availability conflicts on offline sync → reject-and-review (ADR-049), not silent ERP overwrite.
5. Analytics aggregates never settle accounting disputes.

## Coupling that must never happen

- Core domain importing DocType names or Frappe clients
- Synchronous ERP calls inside CompleteSale / checkout TX
- ERP credentials in public env or POS
- Mongo warehouse as GL substitute
- Replacing StoreMembership with ERP Customer as CRM SoT

## Related

- [domain-ownership.md](./domain-ownership.md) (matrix detail)
- ADR-127…134 in `adrs/`
