# ERPNext Accounting

> Official concepts distilled for MerchantOS. Financial truth lives here once the future adapter is enabled.

## Purpose

Financial truth engine. Double-entry bookkeeping that integrates selling, buying, stock, assets, and payroll into one set of books.

## Main concepts

| Concept | Role |
| --- | --- |
| **Company** | Legal books entity; accounts defaults; perpetual inventory flag |
| **Chart of Accounts** | Hierarchical ledger structure |
| **Account** | Leaf ledger head (asset, liability, equity, income, expense) |
| **Cost Center / Dimensions** | Management reporting slices |
| **Journal Entry** | Manual / adjustment double-entry |
| **Sales Invoice** | Customer billing → AR + income (+ optional stock + COGS) |
| **Purchase Invoice** | Supplier bill → AP + expense/asset |
| **Payment Entry** | Receipts/payments allocating against invoices |
| **Payment Ledger Entry** | Outstanding AR/AP tracking |
| **GL Entry** | Immutable posted debit/credit rows |
| **Fiscal Year / Accounting Period** | Period control; freezing |
| **Tax templates** | Sales/purchase tax calculation and account mapping |
| **Mode of Payment** | Cash, card, bank, etc. |

## Lifecycle behavior

1. Create draft Sales Invoice / Payment / Journal.
2. Validate accounts, party, posting date, debit=credit, dimensions.
3. **Submit** → GL (and Payment Ledger / Stock Ledger when relevant).
4. Cancel → reverse entries; prefer Credit Notes for returns rather than silent mutation.

Draft documents do **not** affect books. Submitted documents are the audit trail.

## How transactions affect ledgers

On Sales Invoice submit (typical accrual):

| Debit | Credit |
| --- | --- |
| Customer Receivable (grand total) | Income (net) + Tax accounts |

If **Update Stock** + perpetual inventory: also Stock Ledger qty decrease and COGS / Stock-in-Hand GL entries.

Payment Entry against invoice reduces Payment Ledger outstanding and moves cash/bank vs receivable.

## MerchantOS usage

**External accounting backend.**

MerchantOS must **not** implement:

- Chart of Accounts
- General Ledger
- Journal Entry UX
- Tax filing engines
- A/R aging, A/P aging
- Full financial statements as SoT

MerchantOS may:

- Show simple operational / retention reports from OLTP + Mongo analytics
- Eventually **read** selected ERP balances via ACL (never invent them)

## Sync implication

MOS `SaleCompleted` / `PaymentSucceeded` → AccountingProvider → ERPNext Sales Invoice / Payment Entry (future). POS success never waits on ERPNext.

## Related docs

- [erpnext-selling.md](./erpnext-selling.md)
- [erpnext-inventory.md](./erpnext-inventory.md)
- ADR-133 Accounting Strategy
