# Domain Model (Strict DDD)

## Domains / Bounded Contexts

Identity, Merchant, Store, Catalog, Inventory, POS/Sales, CRM, Loyalty, Ordering, Payments, Analytics, Notifications, Platform Admin.

---

## Identity Context

### Aggregates

**AuthUser**

- Root: `AuthUser`
- Entities: —
- VOs: `PhoneNumber`, `RoleSet`
- Invariants: phone unique globally for auth users; roles non-empty for active users

**OtpChallenge**

- Root: `OtpChallenge`
- VOs: `HashedOtp`, `ExpiryWindow`
- Invariants: max attempts; expiresAt > createdAt; consumed XOR active

### Domain services

- `OtpVerificationPolicy`
- `JwtClaimsFactory` (or application-level)

### Repositories

- `AuthUserRepository`
- `OtpChallengeRepository`

### Domain events

- `MerchantLoggedIn`, `MerchantLoggedOut` (raised at application after success)

---

## Merchant Context

### Aggregate: Merchant

- Entities: —
- VOs: `MerchantName`, `MerchantStatus` (draft|active|suspended), `MerchantSlug`
- Invariants: slug unique; suspended merchant cannot complete new sales (enforced app+domain policy)

### Domain services

- `MerchantActivationPolicy`

### Repositories

- `MerchantRepository`

### Events

- `MerchantCreated`, `MerchantActivated`, `MerchantUpdated`

### Application services

- `RegisterMerchant`
- `ActivateMerchant`
- `UpdateMerchantProfile`
- `SuspendMerchant` (admin)

---

## Store Context

### Aggregate: Store

- VOs: `Address`, `GeoPoint(lat,lng)`, `BusinessHours`, `ContactInfo`, `StoreBranding`, `StoreSlug`, `StoreQrRef`
- Invariants: belongs to one merchant; **address + lat/lng mandatory** before public storefront activation; slug unique

### Repositories

- `StoreRepository`

### Events

- `StoreCreated`, `StoreUpdated`, `StoreQrGenerated`, `StoreBrandingUpdated`

---

## Customer Identity Context (customer audience)

### Aggregates

**CustomerAuthUser** / **CustomerIdentity** — phone OTP audience separate from merchant staff.

### Events

- `CustomerLoggedIn`, `CustomerLoggedOut`

---

## CRM / Membership Context

### Aggregate: Customer

- VOs: `PhoneNumber`, `CustomerName`
- Invariants: identity unique by phone (platform); soft delete

### Aggregate: StoreMembership (first-class)

- Identity: `(storeId, customerId)` 
- VOs: `MembershipStatus`, `MembershipSource` (`pos|qr|storefront|pickup`)
- Invariants: unique per store+customer; store owns CRM lens for this member

### Domain services

- `CustomerSegmentationPolicy` (per store membership)
- `MembershipJoinPolicy`

### Application services

- `UpsertMembershipFromPhone` (POS)
- `JoinStoreViaOtp`
- `GetCustomerProfile` (store-scoped)
- `ListMembers`

### Events

- `CustomerCreated`, `CustomerUpdated`, `CustomerDeleted`, `CustomerReturned`
- `MembershipCreated`, `MembershipUpdated`

### Repositories

- `CustomerRepository`, `StoreMembershipRepository`

## Catalog Context

### Aggregate: Product

- Entities: `ProductVariant` (optional MVP — start single SKU)
- VOs: `Barcode`, `Money`, `ProductName`, `Sku`
- Invariants: barcode unique per merchant; price ≥ 0; soft delete hides from POS default search

### Aggregate: Category

- VOs: `CategoryName`

### Repositories

- `ProductRepository`, `CategoryRepository`

### Events

- `ProductCreated`, `ProductUpdated`, `ProductDeleted`

### Application services

- `CreateProduct`, `UpdateProduct`, `SoftDeleteProduct`, `SearchProducts`, `ResolveBarcode`

---

## Inventory Context

### Aggregate: StockItem

- Identity: productId + storeId (or merchant default store)
- VOs: `Quantity`, `ReorderLevel`
- Invariants: quantity never negative unless policy allows backorder (MVP: no negative)

### Domain services

- `StockAdjustmentService`

### Events

- `InventoryChanged`, `InventoryLow`, `InventoryOutOfStock`

### Repositories

- `StockItemRepository`

---

## POS / Sales Context

### Aggregate: Sale

- Entities: `SaleLine`
- VOs: `Money`, `PaymentMethod`, `ReceiptRef`
- Invariants: ≥1 line; each line qty > 0; customerPhone required; total = sum(lines) - discounts; terminal states canceled/completed irreversible except compensating cancel policy

### Domain services

- `CheckoutPricingService` (line totals, discounts)

### Application services (orchestration)

- `StartSale`
- `CompleteSale` (customer upsert port, stock decrement, loyalty earn/redeem ports, receipt, outbox)
- `CancelSale`

### Events

- `SaleCreated`, `SaleCompleted`, `SaleCanceled`

### Repositories

- `SaleRepository`

---

## Loyalty Context

### Aggregates

**PointRule** (merchant/store config): earn rate (e.g. 100000 IRR = 1 point)

**Wallet**: scoped to **StoreMembership** (per-store balance); points + optional cash credit

**Coupon** / **Reward**: code, rules, redemption limits (store/merchant scoped)

**PointsLedgerEntry** (entity under Wallet or separate append-only aggregate)

### Invariants

- Wallet balance never negative
- Redeem cannot exceed balance
- Expiry removes points with `PointsExpired`
- No cross-store wallet pooling in MVP

### Domain services

- `PointsEarnCalculator`
- `PointsExpiryPolicy`

### Application services

- `ConfigurePointRule`
- `EarnPointsForSale` / `EarnPointsForOrder`
- `RedeemPointsAtCheckout`
- `CreateCoupon`, `RedeemCoupon`
- `ExpirePointsJob`
- Customer-facing: `GetWallet`, `ListRewards` (via ARD-035)

### Events

- `PointsEarned`, `PointsRedeemed`, `PointsExpired`, `CampaignCreated`, `CampaignSent`, `CampaignCompleted`

### Repositories

- `WalletRepository`, `PointRuleRepository`, `CouponRepository`

---

## Ordering Context

### Aggregate: Order

- Entities: `OrderLine`
- VOs: `OrderStatus`, `FulfillmentType` (**pickup only in MVP**), `Money`, `CustomerContact`, `PickupInstructions`
- Status enum MVP: `pending_payment | paid | preparing | ready_for_pickup | picked_up | completed | cancelled | refunded`
- Invariants: valid transitions per pickup-order-architecture; lines non-empty; **no delivery address**

### Application services

- `CreatePickupOrder`
- `MarkOrderPaid`
- `MarkPreparing`
- `MarkReadyForPickup`
- `MarkPickedUp`
- `CompleteOrder`
- `CancelOrder`
- `RefundOrder`

### Events

- `OrderCreated`, `OrderPaid`, `OrderPreparing`, `OrderReadyForPickup`, `OrderPickedUp`, `OrderCompleted`, `OrderCanceled`, `OrderRefunded`
- `OrderDelivered` is **out of MVP scope** (delivery non-goal)

### Repositories

- `OrderRepository`

---

## Payments Context

### Aggregate: Payment

- VOs: `PaymentStatus`, `ProviderRef`, `Money`
- Port: `PaymentGateway`

### Events (optional MVP)

- May map into `OrderPaid` only if PSP deferred

---

## Analytics Context (read model)

### Not write-side aggregates

Projections:

- MerchantOverviewStats
- RevenueStats
- CustomerStats
- RetentionStats (Monthly Returning Customers)

### Integration services

- `AnalyticsProjectionHandler` consuming Sale/Order/Customer events

### Events consumed

- SaleCompleted, Order*, Customer*, StorefrontVisited, CustomerReturned

---

## Notifications Context

### Outbox / Notification

- Channel: in-app | sms
- Integration service publishes to realtime + SMS adapter

---

## Context map summary

See `03-bounded-contexts.md`. POS application service is the primary orchestrator across Catalog, Inventory, CRM, Loyalty.

## Repository conventions

- Interfaces in domain; **Drizzle** implementations in infrastructure
- Methods accept `merchantId` explicitly or via typed `TenantContext`
- Soft-delete filters default on
- Never return Drizzle row types from application services to UI — map to DTOs
- Transactions: accept optional `tx` from use-case unit of work

## Integration services

| Service | Role |
| --- | --- |
| `CacheInvalidationService` | Event → Redis deletes |
| `RealtimePublishService` | Event → EMQX |
| `SmsSender` | OTP / campaigns |
| `ReceiptStorage` | MinIO put |
| `PaymentGateway` | PSP port |
