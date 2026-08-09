# Domain Ownership — MerchantOS ↔ ERPNext

## Principle

MerchantOS owns the **retail experience**. ERPNext will own **accounting documents**. Do not create duplicate accidental sources of truth.

## Ownership matrix

| Domain | MerchantOS | ERPNext | Source of Truth | Sync | Important identifiers | Events emitted (MOS) | Events consumed (future accounting) | Conflict policy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Merchant | Yes | Company projection | MerchantOS | M → E | `merchant.id` | `MerchantCreated`/`Updated` | Map company | MOS wins identity |
| Store | Config/branding/PWA | Warehouse / cost center projection | MerchantOS | M → E | `store.id` | `StoreCreated`/`Updated` | Map warehouse | MOS wins identity |
| Product / SKU / Barcode | Catalog + presentation | Item projection | MerchantOS | M → E | `product.id`, sku, barcode | `ProductCreated`/`Updated` | `syncProduct` | MOS catalog wins; ERP Item is projection |
| Pricing UX | Display / POS price | Selling price field on Item (optional) | MerchantOS retail price | M → E | `priceAmountMinor` | Product events | Optional price sync | MOS wins POS price |
| Customer / Membership | CRM + StoreMembership | Customer projection | MerchantOS CRM | M → E | `customerId`, membership id, phone | `CustomerCreated`, membership events | `syncCustomer` | MOS wins identity; ERP financial balance later E |
| Loyalty | Points wallet/ledger | None (MVP) | MerchantOS | — | wallet / ledger ids | `PointsEarned` | Not accounting | Local only |
| POS Sale | Sale + lines + tender | Sales Invoice / Order doc | MerchantOS sale | M → E | `sale.id`, `idempotencyKey` | `SaleCreated`, `SaleCompleted` | `recordSale` | Idempotent by sale id / idempotency key |
| Online Order | Pickup order lifecycle | Sales doc (paid) | MerchantOS order | M → E | `order.id` | `OrderPaid`, lifecycle events | `recordSale` / order mapping | MOS status wins retail UX |
| Payment (online) | PaymentIntent + gateway | Payment / GL entry | Payment provider + MOS intent | M → E | `payment.id`, `providerRef` | `PaymentSucceeded` | `recordPayment` | Provider confirmation is payment truth; ERP records accounting consequence |
| POS tender | `tenderType` on sale | Cash/mode of payment on sales doc | MerchantOS sale | M → E | sale id | `SaleCompleted` | Included in `recordSale` | MOS wins |
| Operational inventory | `stock_items` + `stock_movements` | Stock ledger / valuation | MOS for availability; ERP for valuation | M → E movements | stock item id, movement id, product id | `StockAdjusted`, sale-driven movements | `recordInventoryAdjustment` / sale lines | Availability conflicts: reject-and-review offline (ADR-049); valuation deferred to ERP |
| Accounting / GL / CoA | No | Yes | ERPNext | E | ERP account ids | — | — | ERP only |
| Supplier | Future thin boundary | Yes | ERPNext (until MOS purchase UX) | E → M optional later | mapping row | — | Future | Do not duplicate purchasing in MOS now |
| Purchase | Future stub events only | Yes | ERPNext | E | — | `PurchaseCompleted` (catalog stub) | Future | No MOS purchase SoT this phase |
| Financial balances | No | Yes | ERPNext | E | — | — | Read via future query ACL | Never from Mongo analytics |
| Tax accounting | Display TBD | Yes | ERPNext | E | tax templates (future) | — | Future | Iran tax rules deferred to ERP + later ADR |
| Delivery | Non-goal MVP (pickup-only) | N/A | — | — | — | — | — | ADR-082 |

## Decision notes

1. **Product** stays MerchantOS — ERPNext Item is a projection keyed by external mapping, never the catalog SoT.
2. **Customer** stays CRM — ERPNext Customer holds financial relationships later; phone/national mobile remains MOS CRM field.
3. **Inventory**: MOS tracks **operational** quantity for sales availability; ERPNext may later own **valuation**. Sync sends movements, not analytics aggregates.
4. **Payment** ≠ **Accounting payment entry**. Gateway confirms money; accounting provider records the consequence after outbox.
5. **Purchase/Supplier** are intentionally ERPNext-first until a MerchantOS purchase UX ADR exists.

## Sync legend

- **M → E**: MerchantOS → ERPNext (outbox driven)
- **E**: ERPNext-native (no MOS SoT)
- **E → M**: optional future reverse sync (balances, purchase receipts) via ACL — not implemented
