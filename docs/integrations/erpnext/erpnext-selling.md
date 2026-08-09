# ERPNext Selling

> Order-to-cash concepts relevant to projecting MerchantOS sales into ERPNext.

## Purpose

Manage customers, quotations, orders, deliveries, invoices, pricing, and sales reporting inside ERPNext.

## Main concepts

| Concept | Role |
| --- | --- |
| **Customer** | Party for selling + AR |
| **Address / Contact** | Linked people and locations |
| **Quotation** | Offer (optional) |
| **Sales Order** | Commercial commitment |
| **Delivery Note** | Stock dispatch |
| **Sales Invoice** | Billing + optional stock update |
| **Payment Entry** | Collection against invoices |
| **Price List / Item Price** | Selling rates |
| **Pricing Rule / Promotional Scheme** | Conditional discounts |
| **Territory / Customer Group** | Segmentation |
| **POS Profile** (ERPNext POS) | Desk-side POS — **not** MerchantOS POS |

## Sales cycle variants (official)

1. **Standard goods:** Quotation? → Sales Order → Delivery Note → Sales Invoice → Payment
2. **Direct invoice + stock:** Sales Invoice (Update Stock) → Payment — best ERP analogue for retail counter sales
3. **Service:** Order/Invoice without Delivery Note / stock
4. **Drop-ship:** Order + supplier direct delivery (not MOS MVP)

## MerchantOS usage

MerchantOS owns:

- POS UX (online + offline PWA)
- Storefront cart / pickup checkout
- Sale / Order aggregates and idempotency

ERPNext receives **projections**:

| MOS event | Likely ERPNext document |
| --- | --- |
| `SaleCompleted` | Sales Invoice (Update Stock) or Sales Invoice without stock if stock already posted separately |
| `OrderPaid` | Sales Invoice (channel=online) +/- Delivery/warehouse mapping |
| `PaymentSucceeded` | Payment Entry allocated to invoice |

Do **not**:

- Replace MOS POS with ERPNext Point of Sale
- Emit ERPNext DocType names as domain `eventType`s
- Require Sales Order in ERP for every retail sale (unnecessary friction)

## Pricing truth

POS/display price SoT remains **MerchantOS**. ERP Item Price may be projected for books consistency; conflicts resolve to MOS retail price for operations.

## Related docs

- [event-contracts.md](./event-contracts.md)
- [erpnext-accounting.md](./erpnext-accounting.md)
