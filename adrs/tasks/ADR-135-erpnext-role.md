# ADR-135 - ERPNext Role (Financial Brain)

| Field | Value |
| --- | --- |
| ID | ADR-135 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext goal re-evaluation |
| Folder | `adrs/tasks/` — architecture contract; runtime adapter ADR-140 |
| Supersedes (clarifies) | ADR-133 (accounting strategy intent); PRD ERPNext vision |

## Status

`Accepted` — Product/architecture role definition. Does not mean ERPNext is fully connected in every env.

## Title

ERPNext Role — Financial Brain Behind MerchantOS Retail OS

## Context

Earlier ERPNext work over-emphasized documentation and empty seams while implying “integration landed.” The real product goal was misunderstood as “add ERPNext files,” not “connect MerchantOS retail runtime to an external financial engine.”

MerchantOS is an Iranian-native retail operating system for local stores. ERPNext is open-source ERP/accounting (Frappe). These are complementary, not substitutes.

## Problem Statement

Without a single Role decision, agents:

1. Try to replace POS/storefront with ERPNext Desk/Website.
2. Rebuild GL / tax / purchasing inside MerchantOS.
3. Treat docs/ADRs as delivery complete when no books sync exists.

## Decision

### MerchantOS is

A **retail operating system** that owns the merchant-facing and customer-facing retail experience:

- POS (fast checkout, barcode, offline staff POS, receipts)
- Online store / storefront / store customer PWA
- CRM, membership, loyalty, promotions, customer history
- Catalog UX, operational inventory UX, sales/orders/pickup workflows

### ERPNext is

The **financial brain / ERP engine** behind MerchantOS. It owns:

- Accounting: Chart of Accounts, GL, Journal Entry, Sales Invoice, Purchase Invoice, Payment Entry, A/R, A/P, tax accounting configuration, financial reports
- Purchasing: Supplier, Purchase Order, Purchase Receipt, supplier invoices
- Enterprise inventory **accounting**: valuation, warehouse accounting, stock ledger / COGS books

### Composition

```
Customers → MerchantOS UI (POS | Storefront | CRM)
                 ↓
           MerchantOS Core (sales, orders, ops inventory, customers, loyalty)
                 ↓ Outbox → Integration Worker → ERPNext Adapter
                 ↓
              ERPNext (accounting, purchasing, financial reports)
```

### Hard laws

1. MerchantOS does **not** become ERP software.
2. ERPNext does **not** replace MerchantOS UX for cashiers, merchants, or store customers.
3. Core domains never import Frappe/ERPNext SDKs or DocTypes.
4. Integration only via `AccountingProvider` + transactional outbox (never HTTP inside CompleteSale / checkout TX).

## Connection points (where systems meet)

| Trigger in MerchantOS | ERPNext consequence |
| --- | --- |
| ProductCreated / ProductUpdated | Item (+ Item Price when configured) |
| MembershipCreated / SaleCompleted(customer) | Customer (Party) |
| SaleCompleted (POS) | Sales Invoice (+ Update Stock) + Payment when tender known |
| OrderPaid + PaymentSucceeded | Sales Invoice (online) + Payment Entry |
| StockAdjusted (manual ops) | Stock Entry (Material Issue/Receipt) |
| (ERP-first) Purchase Receipt | Later E→M ops stock increase (not Role MVP) |

## Rationale

PRD already forbids “MerchantOS is accounting software.” Iranian retail still needs real books for accountants. ERPNext supplies that without forcing Desk onto cashiers.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| Embed ERPNext Website as storefront | Violates store-first Iranian UX; loses membership/OTP ownership |
| Build GL inside MOS | Duplicates ERP; not product mission |
| Run merchant ops inside Desk | Wrong persona; RTL/Persian POS not Desk’s job |

## Consequences

- Agents must judge ERPNext work by **book postings reachable from MOS events**, not by doc count.
- Purchasing remains ERP-first until a dedicated MOS purchase UX ADR (unlikely for MVP).
- Operational stock stays MOS SoT; valuation stays ERPNext (ADR-137 / ADR-132).

## Iranian User Experience Requirements

- **Persian localization impact:** MerchantOS surfaces remain Persian; ERP Desk may be used in Persian by accountants but is not the primary retail UX.
- **RTL requirements:** Retail UIs stay RTL in MOS; Do not force Desk into cashier flows.
- **Mobile usability impact:** Cashiers/customers stay on MOS PWAs; accountants may use Desk on desktop.
- **Iranian business workflow impact:** تومان display, Jalali merchant analytics remain MOS; statutory books live in ERPNext company currency (IRR).

## Completion Criteria

- [x] Role documented and referenced from AGENT.md / PRD / README
- [ ] Live adapter posting Sales Invoice from SaleCompleted in local Docker (ADR-140)
- [ ] Iranian First checklist N/A for Desk-only accountants path

## Related ADRs

- ADR-126 (prep seams), ADR-128 (ownership matrix), ADR-132–134, ADR-136–140
