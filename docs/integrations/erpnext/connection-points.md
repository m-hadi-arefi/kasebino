# Connection points — MerchantOS ↔ ERPNext

Source of truth: **ADR-135…140**. This file is the operational map for implementers.

## Principle

MerchantOS = retail OS. ERPNext = financial brain. Connect at the outbox boundary only.

## Event → DocType

| MOS event | When enqueued | Provider method | ERPNext DocType | Notes |
| --- | --- | --- | --- | --- |
| ProductCreated / ProductUpdated | Catalog HTTP | `syncProduct` | Item (+ Item Price optional) | MOS catalog SoT |
| ProductDeleted | Catalog HTTP | `syncProduct(disabled)` | Item.disabled=1 | Soft delete |
| MembershipCreated / MembershipUpdated | CRM HTTP + POS CompleteSale outbox | `syncCustomer` | Customer | Party for A/R; not ERP CRM module |
| SaleCompleted | CompleteSale UoW | `syncCustomer?` + `recordSale` | Sales Invoice (`update_stock=1`) | POS tender → invoice payments |
| OrderPaid | Payments/orders HTTP | `recordSale` | Sales Invoice (`update_stock=0`) | **lines required** |
| PaymentSucceeded | Payments HTTP | `recordPayment` | Payment Entry | Online PSP |
| StockAdjusted | Inventory adjust HTTP | `recordInventoryAdjustment` | Stock Entry | Do **not** duplicate POS sale stock |

## Explicit non-connections

| Surface | Why not |
| --- | --- |
| Loyalty points | Engagement SoT stays MOS |
| Storefront HTML | ERP Website is not MOS storefront |
| Desk as POS | ADR-139 |
| Purchase in MOS | ERP-first purchasing (ADR-137) |

## Stock policy

- Operational qty: MOS `StockItem`
- COGS/valuation: ERPNext
- POS sale stock: via Sales Invoice **Update Stock** only
- Manual adjust: Stock Entry only

## Local connect

See [`scripts/erpnext/README.md`](../../../scripts/erpnext/README.md).
