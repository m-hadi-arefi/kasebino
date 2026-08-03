# Cache Strategy

## Redis key naming

Pattern:

```
mos:{env}:m:{merchantId}:{domain}:{resource}:{id_or_hash}
```

Examples:

| Key | Purpose |
| --- | --- |
| `mos:dev:m:{m}:merchant:profile` | Merchant profile |
| `mos:dev:m:{m}:store:{storeId}` | Store |
| `mos:dev:m:{m}:product:{productId}` | Product detail |
| `mos:dev:m:{m}:barcode:{barcode}` | Barcode → productId |
| `mos:dev:m:{m}:products:list:{queryHash}` | Product list/search page |
| `mos:dev:m:{m}:customer:{customerId}` | Customer profile |
| `mos:dev:m:{m}:customer:phone:{phone}` | Phone → customerId |
| `mos:dev:m:{m}:wallet:{storeId}:{customerId}` | Loyalty wallet (store-scoped) |
| `mos:dev:m:{m}:membership:{storeId}:{customerId}` | Store membership |
| `mos:dev:m:{m}:stock:{storeId}:{productId}` | Stock qty |
| `mos:dev:m:{m}:analytics:overview` | Dashboard overview |
| `mos:dev:m:{m}:analytics:revenue:{range}` | Revenue dash |
| `mos:dev:m:{m}:analytics:retention` | North Star inputs |
| `mos:dev:m:{m}:sf:catalog:{pageHash}` | Storefront catalog |
| `mos:dev:m:{m}:sf:product:{productId}` | Storefront product page |
| `mos:dev:rl:{scope}:{id}` | Rate limit counters |

Use `:` separators only; kebab/structural segments lowercase.

Canonical builders + TTL table: `src/cache-keys/` (ADR-053).

## TTLs

| Class | TTL | Examples |
| --- | --- | --- |
| Hot entity | 300s | merchant, product, customer, settings, stock |
| Analytics | 60s | dashboards, retention |
| Storefront | 600s | public catalog/product/merchant info |
| Rate limits | window-sized | auth 60s windows |
| Idempotency | 24h–7d | sale/order keys |

## Patterns

### Cache-aside (default)

Read path rebuilds on miss. Mutations do not write cache immediately unless optimization approved.

### Read-through

Not used as a framework; keep in application services explicitly if ever needed.

### Write-through

Optional for tiny settings documents after successful DB write — still publish invalidation for other keys.

### Distributed cache rules

- All app instances share Redis
- No in-process singleton caches for tenant business data (request memo OK)
- Stampede: optional single-flight lock `SET nx px 1000` on rebuild for analytics keys

## Hot vs cold

| Hot | Cold |
| --- | --- |
| Barcode lookups, active products, open POS session customer, wallet | Historical sales pages, old campaigns, deep analytics ranges |

Hot keys: shorter TTL + aggressive invalidation on events.  
Cold: DB only or longer TTL list pages.

## Domain strategies

### Analytics cache

- Key per dashboard widget + range
- Rebuild from projection tables (not raw scans on request if avoidable)
- Invalidate on SaleCompleted/OrderPaid/CustomerReturned

### Dashboard cache

- `analytics:overview` 60s
- Realtime events can optimistic-update client without waiting TTL

### Storefront cache

- 600s TTL + invalidate on Product*/Store*/MerchantUpdated
- Anonymous; never cache personalized wallet pages publicly

## Invalidation playbook

1. Prefer explicit key deletes from event → key map (`src/cache-invalidation/`, ADR-054)
2. Use Redis SCAN sparingly; prefer hashed list keys registered in a set `mos:{m}:product:listkeys` when needed
3. Never FLUSHDB in app code

Canonical helper: `invalidateOnEvent` + `keysForEvent` (MVP: SaleCompleted / ProductUpdated / StoreUpdated).

## Validation

Integration tests must prove: update product → storefront/product cache miss → fresh price.
