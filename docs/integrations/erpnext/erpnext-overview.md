# ERPNext Overview (MerchantOS Knowledge Base)

> Research reference for future integration. Sources: [ERPNext docs](https://docs.frappe.io/erpnext), [Frappe Framework](https://docs.frappe.io/framework). No live connection in this phase.

## What ERPNext is

ERPNext is an open-source ERP built on the **Frappe Framework** (Python + MariaDB/PostgreSQL, document-centric). It provides integrated modules for accounting, stock, selling, buying, manufacturing, HR, projects, assets, and a Website/CMS layer.

MerchantOS treats ERPNext as an **external ERP / accounting capability**, not as the product surface for Iranian retail cashiers or customers.

## Under the hood

| Layer | Role |
| --- | --- |
| Frappe Framework | Auth, permissions, DocTypes, REST API, workflows, schedulers, Desk UI |
| ERPNext app | Domain DocTypes (Item, Sales Invoice, GL Entry, …) and controllers |
| Desk UI | Internal operator UI for accountants, buyers, stock clerks |
| Website module | Optional public CMS / web shop (not MerchantOS’s storefront strategy) |

## Document model (critical)

Almost everything in ERPNext is a **DocType** (document):

1. **Draft** (`docstatus = 0`) — editable; usually no ledger effect.
2. **Submitted** (`docstatus = 1`) — immutable business document; posts GL / Stock / Payment ledgers where applicable.
3. **Cancelled** (`docstatus = 2`) — reverses ledger effects; history retained.

Controllers (e.g. `AccountsController`, `StockController`, `SellingController`, `BuyingController`) enforce validation and post ledgers on submit.

## Core modules MerchantOS cares about

| Module | Purpose for MerchantOS |
| --- | --- |
| Accounting | Financial SoT — CoA, journals, invoices, payments, reports |
| Stock | Inventory valuation ledger (optional sync); Warehouses |
| Selling | Sales Invoice / Order as accounting projections of MOS sales |
| Buying | Procurement SoT until MOS has purchase UX |
| CRM | Weak fit — ERPNext CRM is being deprecated toward Frappe CRM; MOS owns retail CRM |
| Website | Do **not** replace MOS storefront / PWA |

## Controllers & ledgers

ERPNext separates **source documents** from **ledger effects**:

| Ledger | Tracks |
| --- | --- |
| General Ledger (`GL Entry`) | Debit/credit by account |
| Payment Ledger | AR/AP outstanding and allocations |
| Stock Ledger (`Stock Ledger Entry`) | Qty, rate, value by Item + Warehouse |

Perpetual inventory (default) posts accounting entries on every stock-affecting submit so Stock Ledger value stays aligned with Balance Sheet stock accounts.

## Multi-company / warehouse shape

- **Company** — legal / books entity.
- **Warehouse** — stock location (often mapped from MOS Store).
- **Cost Center / Accounting Dimensions** — optional P&L slicing (e.g. per store).
- **Customer / Supplier** — Parties for AR/AP.
- **Item** — product/service master (projection of MOS Product).

## How MerchantOS should think about ERPNext

```text
MerchantOS = retail experience truth (POS, CRM, loyalty, storefront, operational stock)
ERPNext    = financial / ERP truth (GL, tax accounting, purchase books, valuation)
Boundary   = AccountingProvider + outbox + external_entity_mappings (ADR-126+)
```

## Official entry points

- ERPNext user manual: https://docs.frappe.io/erpnext
- Frappe REST API: https://docs.frappe.io/framework/user/en/api/rest
- Token auth: `Authorization: token api_key:api_secret`
- Resource CRUD: `/api/resource/:doctype[/:name]`
- Whitelisted methods: `/api/method/...`

## Non-usage rules (MerchantOS)

1. Do not embed Desk as MerchantOS UI.
2. Do not import Frappe/ERPNext SDKs into core domain modules.
3. Do not call ERPNext from browser / POS / customer PWA.
4. Do not treat ERPNext CRM or Website as MOS replacements.
