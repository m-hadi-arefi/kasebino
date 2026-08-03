# 03 — Bounded Contexts

## Contexts (MVP)

| Context | Language | Models | Integration style |
| --- | --- | --- | --- |
| Identity & Access | User, OTP, Session, Role | AuthUser, OtpChallenge, JwtClaims | Shared ID for actor |
| Merchant Management | Merchant, Plan, Status | Merchant, MerchantSettings | Published language: Merchant* events |
| Store Operations | Store, Hours | Store | Open Host: catalog/POS depend |
| Product Catalog | Product, SKU, Barcode, Category | Product, Category | ACL for storefront DTO |
| Inventory | StockItem, Reservation | StockItem | Events to POS/Storefront |
| Point of Sale | Cart, Sale, Receipt, LineItem | Sale, SaleLine | Orchestrates CRM/Loyalty via app service |
| Customer CRM | Customer, Segment | Customer, CustomerStats | Phone unique per merchant |
| Loyalty | PointsLedger, Wallet, Coupon, Reward | Wallet, Coupon, PointRule | Subscribes SaleCompleted |
| Online Ordering | Order, OrderLine, Fulfillment | Order | Publishes Order* |
| Payments | PaymentIntent, Capture | Payment | Port to PSP |
| Analytics | Metrics, Cohorts | Read models / aggregates tables | Event consumers |
| Notifications | Notification, Channel | NotificationOutbox | Subscribes many events |
| Platform Admin | AdminUser, Enforcement | AdminAction | Separate role; P1 |

## Context map (textual)

```
Identity --Customer/Supplier--> Merchant Management
Merchant Management --OHS--> Store Operations
Store Operations --OHS--> Product Catalog
Product Catalog --Partner--> Inventory
POS --OHS--> Product Catalog, Inventory
POS --Conformist--> CRM, Loyalty (uses their APIs/events)
CRM --Partner--> Loyalty
Storefront (UI) --ACL--> Catalog + Ordering
Ordering --Partner--> Payments, Inventory
Analytics --Conformist--> Sale/Order/CRM events
Notifications --Conformist--> Event bus
Admin --OHS--> Merchant Management
```

OHS = Open Host Service, ACL = Anti-Corruption Layer.

## Anti-corruption

Storefront and Admin UIs must not import POS domain internals. Map via application DTOs.

## Transaction boundaries

One aggregate write per DB transaction when possible. POS completion may use an application-level unit of work that:

1. Persists Sale
2. Upserts Customer
3. Adjusts Inventory
4. Posts Loyalty ledger entries
5. Writes Outbox events

Then commits and publishes outbox atomically (transactional outbox pattern).
