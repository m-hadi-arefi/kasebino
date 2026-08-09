# ERPNext Data Model Concepts

## Document-centric model

ERPNext data is organized as **DocTypes** with fields, child tables, links, and permissions — not as a classic app-specific ORM owned by MerchantOS.

Important metadata fields on documents:

| Field | Meaning |
| --- | --- |
| `name` | Primary key |
| `owner` / `modified_by` | Audit users |
| `creation` / `modified` | Timestamps |
| `docstatus` | 0 draft / 1 submitted / 2 cancelled |
| `company` | Books entity (on most transactions) |
| `amended_from` | Amendment chain |

## Relationships (high level)

```text
Company
  ├── Chart of Accounts / Accounts
  ├── Warehouses
  ├── Cost Centers
  ├── Customers / Suppliers (parties)
  └── Items (global masters, company defaults via accounts)

Customer ──< Sales Invoice >── Item
                │
                ├── GL Entry
                ├── Payment Ledger Entry
                └── Stock Ledger Entry (if Update Stock)

Supplier ──< Purchase Invoice / Receipt >── Item
Warehouse × Item → Bin + Stock Ledger Entry
```

## Masters vs transactions

| Kind | Examples | Mutability |
| --- | --- | --- |
| Masters | Item, Customer, Supplier, Warehouse, Account | Editable with constraints |
| Transactions | SI, PI, Payment, Stock Entry, JE | Draft editable; submit freezes; cancel reverses |

## Child tables

Line items live as child DocTypes (e.g. Sales Invoice Item) with `parent` / `parenttype` / `parentfield`. REST create sends nested arrays in the parent payload.

## Parties

Customer and Supplier are **Parties**. Accounts receivable/payable defaults and credit limits attach here. Contacts and Addresses are separate linked docs (many-to-many style via Dynamic Links).

## Stock vs accounts coupling

With perpetual inventory:

- Stock LE tracks qty and valuation rate.
- Matching GL entries keep Stock-in-Hand accounts consistent.
- Disabling perpetual inventory shifts valuation to periodic manual journals — **not recommended** for MOS integration.

## MOS mapping keys (vendor-neutral)

Never add `erpnext_id` columns on core tables. Use:

`external_entity_mappings(provider, entity_type, entity_id ↔ external_id)`

Suggested `entity_type` values: `merchant`, `store_warehouse`, `store_cost_center`, `product`, `customer`, `sale`, `order`, `payment`, `stock_movement`.

## What not to model in MOS

- GL Entry rows
- Payment Ledger
- Fiscal Year / Period Closing
- Tax templates as SoT
- ERP naming series generators

## Related docs

- [store-mapping.md](./store-mapping.md)
- ADR-130 Product Mapping / ADR-131 Customer Mapping
