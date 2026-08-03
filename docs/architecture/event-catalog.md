# Event Catalog

Canonical envelope fields apply to all events (see `04-event-driven-architecture.md`):
`eventId`, `eventType`, `occurredAt`, `merchantId`, `storeId`, `actorId`, `correlationId`, `causationId`, `payloadVersion`, `payload`.

## Global policies

| Concern | Policy |
| --- | --- |
| Delivery | At-least-once via transactional outbox |
| Ordering | Per-aggregate best-effort; consumers must not assume global order |
| Schema evolution | Increment `payloadVersion`; consumers tolerate unknown fields |
| PII | Phone numbers allowed in payloads for CRM correctness; minimize logging of raw payloads |

## Events


### `MerchantCreated`

| Field | Value |
| --- | --- |
| Publisher | Merchant context / RegisterMerchant |
| Subscribers | Admin monitoring, Notifications, Analytics bootstrap, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete `mos:{m}:merchant:profile`, `mos:{m}:settings:*` |

**Payload**

```json
{
  "merchantId": "uuid",
  "name": "string",
  "slug": "string",
  "ownerUserId": "uuid"
}
```

### `MerchantActivated`

| Field | Value |
| --- | --- |
| Publisher | MerchantActivationPolicy / Admin |
| Subscribers | Admin, Analytics, Notifications |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete merchant profile/settings keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "activatedAt": "ISO-8601"
}
```

### `MerchantUpdated`

| Field | Value |
| --- | --- |
| Publisher | UpdateMerchantProfile |
| Subscribers | Storefront cache, CacheInvalidation, Realtime dashboard |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete merchant profile, storefront merchant info keys (TTL 600s class) |

**Payload**

```json
{
  "merchantId": "uuid",
  "changedFields": [
    "string"
  ]
}
```

### `StoreCreated`

| Field | Value |
| --- | --- |
| Publisher | Store application service |
| Subscribers | Catalog defaults, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete `mos:{m}:store:{storeId}`, store list keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "storeId": "uuid",
  "name": "string"
}
```

### `StoreUpdated`

| Field | Value |
| --- | --- |
| Publisher | Store application service |
| Subscribers | Storefront, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete store + storefront info keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "storeId": "uuid",
  "changedFields": [
    "string"
  ]
}
```

### `ProductCreated`

| Field | Value |
| --- | --- |
| Publisher | Catalog CreateProduct |
| Subscribers | Inventory bootstrap, Storefront, CacheInvalidation, Realtime |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete product detail, product lists, barcode key, storefront catalog |

**Payload**

```json
{
  "merchantId": "uuid",
  "productId": "uuid",
  "barcode": "string|null",
  "name": "string",
  "price": {
    "amount": 0,
    "currency": "IRR"
  }
}
```

### `ProductUpdated`

| Field | Value |
| --- | --- |
| Publisher | Catalog UpdateProduct |
| Subscribers | POS search warmers optional, Storefront, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Same as ProductCreated deletes |

**Payload**

```json
{
  "merchantId": "uuid",
  "productId": "uuid",
  "changedFields": [
    "string"
  ]
}
```

### `ProductDeleted`

| Field | Value |
| --- | --- |
| Publisher | Catalog SoftDeleteProduct |
| Subscribers | Inventory, Storefront, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete product/list/barcode/storefront keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "productId": "uuid",
  "deletedAt": "ISO-8601"
}
```

### `InventoryChanged`

| Field | Value |
| --- | --- |
| Publisher | Inventory StockAdjustment / CompleteSale |
| Subscribers | POS UI realtime, Storefront availability, Analytics, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete `mos:{m}:stock:{storeId}:{productId}`, product availability fragments |

**Payload**

```json
{
  "merchantId": "uuid",
  "storeId": "uuid",
  "productId": "uuid",
  "delta": 0,
  "quantityAfter": 0,
  "reason": "sale|restock|adjust"
}
```

### `InventoryLow`

| Field | Value |
| --- | --- |
| Publisher | Inventory policy on change |
| Subscribers | Notifications, Admin hooks |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | None mandatory beyond stock key (already invalidated by InventoryChanged) |

**Payload**

```json
{
  "merchantId": "uuid",
  "storeId": "uuid",
  "productId": "uuid",
  "quantity": 0,
  "reorderLevel": 0
}
```

### `InventoryOutOfStock`

| Field | Value |
| --- | --- |
| Publisher | Inventory policy |
| Subscribers | Storefront, Notifications, Realtime |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete stock + storefront product availability |

**Payload**

```json
{
  "merchantId": "uuid",
  "storeId": "uuid",
  "productId": "uuid"
}
```

### `CustomerCreated`

| Field | Value |
| --- | --- |
| Publisher | CRM Upsert from POS/Storefront |
| Subscribers | Loyalty wallet create, Analytics, Realtime, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete customer profile/list/stats keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "customerId": "uuid",
  "phone": "string"
}
```

### `CustomerUpdated`

| Field | Value |
| --- | --- |
| Publisher | CRM Update |
| Subscribers | Analytics, Realtime, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete customer profile/stats |

**Payload**

```json
{
  "merchantId": "uuid",
  "customerId": "uuid",
  "changedFields": [
    "string"
  ]
}
```

### `CustomerDeleted`

| Field | Value |
| --- | --- |
| Publisher | CRM SoftDelete |
| Subscribers | Loyalty deactivate hooks, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete customer keys; exclude from list caches |

**Payload**

```json
{
  "merchantId": "uuid",
  "customerId": "uuid",
  "deletedAt": "ISO-8601"
}
```

### `SaleCreated`

| Field | Value |
| --- | --- |
| Publisher | POS Start/Complete pipeline |
| Subscribers | Realtime POS monitors |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Usually minimal; optional dashboard flash keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "saleId": "uuid",
  "storeId": "uuid",
  "status": "created"
}
```

### `SaleCompleted`

| Field | Value |
| --- | --- |
| Publisher | POS CompleteSale |
| Subscribers | Inventory, Loyalty earn, CRM stats/segments, Analytics, Receipt, Realtime, CacheInvalidation, Notifications |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete dashboard aggregations (60s class), customer stats, loyalty wallet cache, stock keys for line products, recent sales lists |

**Payload**

```json
{
  "merchantId": "uuid",
  "saleId": "uuid",
  "storeId": "uuid",
  "customerId": "uuid",
  "phone": "string",
  "total": {
    "amount": 0,
    "currency": "IRR"
  },
  "lineProductIds": [
    "uuid"
  ],
  "completedAt": "ISO-8601"
}
```

### `SaleCanceled`

| Field | Value |
| --- | --- |
| Publisher | POS CancelSale |
| Subscribers | Inventory restock handler, Loyalty reversal policy, Analytics, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Same class as SaleCompleted invalidations |

**Payload**

```json
{
  "merchantId": "uuid",
  "saleId": "uuid",
  "reason": "string"
}
```

### `OrderCreated`

| Field | Value |
| --- | --- |
| Publisher | Ordering CreateStorefrontOrder |
| Subscribers | Merchant realtime, Inventory reserve (if used), Notifications, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete open-orders lists; storefront cart server caches if any |

**Payload**

```json
{
  "merchantId": "uuid",
  "orderId": "uuid",
  "total": {
    "amount": 0,
    "currency": "IRR"
  },
  "customerPhone": "string|null"
}
```

### `OrderPaid`

| Field | Value |
| --- | --- |
| Publisher | Payments/Ordering |
| Subscribers | Fulfillment UI, Analytics, Notifications, CacheInvalidation |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete order detail/list + revenue aggregates |

**Payload**

```json
{
  "merchantId": "uuid",
  "orderId": "uuid",
  "paymentId": "uuid",
  "paidAt": "ISO-8601"
}
```

### `PaymentIntentCreated`

| Field | Value |
| --- | --- |
| Publisher | Payments createIntent (ADR-012) |
| Subscribers | Analytics (optional), Audit |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId |
| Cache invalidation | None aggressive (payment intents not cached as SoT) |

**Payload**

```json
{
  "paymentId": "uuid",
  "merchantId": "uuid",
  "storeId": "uuid",
  "orderId": "uuid",
  "amountMinor": "string",
  "status": "processing",
  "providerId": "sandbox"
}
```

### `PaymentSucceeded`

| Field | Value |
| --- | --- |
| Publisher | Payments confirm/webhook (ADR-012 sandbox) |
| Subscribers | Ordering markPaid path, Analytics |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId; payment aggregate status guard |
| Cache invalidation | None aggressive |

**Payload**

```json
{
  "paymentId": "uuid",
  "merchantId": "uuid",
  "orderId": "uuid",
  "amountMinor": "string",
  "providerRef": "string|null",
  "status": "succeeded"
}
```

### `PaymentFailed`

| Field | Value |
| --- | --- |
| Publisher | Payments confirm/webhook |
| Subscribers | Analytics (payment failure rates), Notifications |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId |
| Cache invalidation | None |

**Payload**

```json
{
  "paymentId": "uuid",
  "merchantId": "uuid",
  "orderId": "uuid",
  "failureCode": "string",
  "status": "failed"
}
```

### `PaymentRefunded`

| Field | Value |
| --- | --- |
| Publisher | Payments refundPayment |
| Subscribers | Ordering refund coordination, Analytics |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId |
| Cache invalidation | Order detail/list |

**Payload**

```json
{
  "paymentId": "uuid",
  "merchantId": "uuid",
  "orderId": "uuid",
  "amountMinor": "string",
  "status": "refunded"
}
```

### `OrderCanceled`

| Field | Value |
| --- | --- |
| Publisher | Ordering CancelOrder |
| Subscribers | Inventory release, Analytics, Realtime |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete order lists/detail |

**Payload**

```json
{
  "merchantId": "uuid",
  "orderId": "uuid",
  "reason": "string"
}
```

### `OrderDelivered`

| Field | Value |
| --- | --- |
| Publisher | Ordering MarkDelivered |
| Subscribers | CRM optional, Analytics, Realtime |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete order detail/list |

**Payload**

```json
{
  "merchantId": "uuid",
  "orderId": "uuid",
  "deliveredAt": "ISO-8601"
}
```

### `PointsEarned`

| Field | Value |
| --- | --- |
| Publisher | Loyalty EarnPointsForSale |
| Subscribers | CRM UI, Wallet cache, Analytics, Realtime |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete `mos:{m}:wallet:{customerId}`, loyalty stats |

**Payload**

```json
{
  "merchantId": "uuid",
  "customerId": "uuid",
  "saleId": "uuid",
  "points": 0,
  "balanceAfter": 0
}
```

### `PointsRedeemed`

| Field | Value |
| --- | --- |
| Publisher | Loyalty RedeemPointsAtCheckout |
| Subscribers | POS UI, Wallet cache, Analytics |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete wallet + loyalty stats |

**Payload**

```json
{
  "merchantId": "uuid",
  "customerId": "uuid",
  "saleId": "uuid|null",
  "points": 0,
  "balanceAfter": 0
}
```

### `PointsExpired`

| Field | Value |
| --- | --- |
| Publisher | Loyalty ExpirePointsJob |
| Subscribers | Wallet cache, Notifications optional |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete wallet keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "customerId": "uuid",
  "points": 0,
  "balanceAfter": 0
}
```

### `CampaignCreated`

| Field | Value |
| --- | --- |
| Publisher | Loyalty/Marketing (MVP+) |
| Subscribers | Admin/merchant UI |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete campaign list keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "campaignId": "uuid",
  "channel": "sms"
}
```

### `CampaignSent`

| Field | Value |
| --- | --- |
| Publisher | Campaign sender |
| Subscribers | Realtime campaign progress |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete campaign progress keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "campaignId": "uuid",
  "sentCount": 0
}
```

### `CampaignCompleted`

| Field | Value |
| --- | --- |
| Publisher | Campaign sender |
| Subscribers | Analytics, UI |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete campaign keys |

**Payload**

```json
{
  "merchantId": "uuid",
  "campaignId": "uuid",
  "stats": {}
}
```

### `MerchantLoggedIn`

| Field | Value |
| --- | --- |
| Publisher | Identity verify success |
| Subscribers | Security audit, Admin monitoring optional |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | None |

**Payload**

```json
{
  "userId": "uuid",
  "merchantId": "uuid|null",
  "at": "ISO-8601"
}
```

### `MerchantLoggedOut`

| Field | Value |
| --- | --- |
| Publisher | Identity logout |
| Subscribers | Security audit |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | None |

**Payload**

```json
{
  "userId": "uuid",
  "merchantId": "uuid|null",
  "at": "ISO-8601"
}
```

### `StorefrontVisited`

| Field | Value |
| --- | --- |
| Publisher | Storefront middleware/page |
| Subscribers | Analytics (sampled) |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Rarely invalidates; may bump analytics TTL naturally |

**Payload**

```json
{
  "merchantId": "uuid",
  "path": "string",
  "at": "ISO-8601",
  "anonId": "string|null"
}
```

### `CustomerReturned`

| Field | Value |
| --- | --- |
| Publisher | CRM segmentation / SaleCompleted policy |
| Subscribers | Analytics retention, Notifications |
| Retry strategy | Exponential backoff: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter. At-least-once. |
| Idempotency strategy | Consumer dedupe on eventId (processed_events table or Redis SETNX with TTL ≥ 7d). |
| Cache invalidation | Delete retention aggregates + customer stats |

**Payload**

```json
{
  "merchantId": "uuid",
  "customerId": "uuid",
  "previousPurchaseAt": "ISO-8601",
  "at": "ISO-8601"
}
```


## Subscriber matrix (summary)

| Subscriber | Interested events |
| --- | --- |
| CacheInvalidationService | All mutating *Created/*Updated/*Deleted/*Completed/*Changed |
| RealtimePublishService | All listed for UI topics |
| Loyalty handlers | SaleCompleted, SaleCanceled, CustomerCreated |
| Inventory handlers | SaleCompleted, SaleCanceled, Order* (if reserved) |
| AnalyticsProjectionHandler | Sale*, Order*, Customer*, StorefrontVisited, CustomerReturned, Points* |
| NotificationService | InventoryLow/Out, OrderCreated, Campaign*, security-sensitive admin |
