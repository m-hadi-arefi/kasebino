# ERPNext Inventory (Stock)

> Stock module concepts for MerchantOS inventory strategy decisions.

## Purpose

Inventory tracking, valuation, warehouse management, and stock transactions that can post into accounting (perpetual inventory).

## Main concepts

| Concept | Role |
| --- | --- |
| **Item** | Product/service master; `Maintain Stock` flag |
| **Item Group** | Classification tree |
| **UOM** | Unit of measure + conversion factors |
| **Warehouse** | Physical/logical location |
| **Bin** | Cached qty per Item × Warehouse |
| **Stock Ledger Entry (SLE)** | Append-only movement + valuation rows |
| **Stock Entry** | Material receipt/issue/transfer/manufacture movements |
| **Delivery Note** | Outbound delivery (selling) |
| **Purchase Receipt** | Inbound receipt (buying) |
| **Sales Invoice (Update Stock)** | Combined bill + stock out (retail-style) |
| **Stock Reconciliation** | Align book qty with physical count |
| **Batch / Serial No** | Traceability |
| **Valuation Method** | FIFO or Moving Average (Item/Company) |

## Lifecycle & behavior

- Stock quantity and value change only when stock-updating documents are **submitted**.
- Perpetual inventory keeps Stock Ledger value aligned with CoA stock accounts.
- Negative stock is configurable (and more restricted for serial/batch items in newer versions).
- Warehouses can link to inventory Asset accounts for warehouse-wise Balance Sheet views.

## Valuation note

ERPNext stock value is an **accounting** concern (asset on Balance Sheet, COGS on P&L). MerchantOS operational availability is a **retail** concern (can I sell this SKU at this store?).

These must not be conflated.

## MerchantOS usage

| Concern | Owner |
| --- | --- |
| Sellable on-hand for POS/storefront | **MerchantOS** (`stock_items` + `stock_movements`) |
| Inventory valuation / COGS books | **ERPNext** (future) |
| Warehouse identity | Mapped Store → Warehouse via `external_entity_mappings` |

Sync sends **movements / sale lines**, not Mongo analytics aggregates.

MerchantOS should **not** duplicate ERPNext valuation engines.

## Preferred ERP projection for retail sales

For counter/retail sales synchronized from MOS, prefer ERPNext pattern:

**Sales Invoice with Update Stock** (single document affects Stock + GL),

unless a later ADR chooses Sales Order → Delivery Note → Invoice for deferred billing.

## Related docs

- [domain-ownership.md](./domain-ownership.md)
- ADR-132 Inventory Strategy
