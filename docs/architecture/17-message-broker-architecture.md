# 17 — Message Broker Architecture

## Broker: EMQX (MQTT)

Used for realtime fan-out and future service integration — not as the system of record.

## Publish path

```
DB TX + Outbox row → Outbox worker → EMQX publish → subscribers
```

## Topic ACL

- Clients authenticate; ACL restricts subscribe to own merchant topics
- App service uses privileged publisher credentials

## Topic catalog (MVP)

| Topic | Events |
| --- | --- |
| `.../sales` | SaleCreated, SaleCompleted, SaleCanceled |
| `.../orders` | OrderCreated, OrderPaid, OrderCanceled, OrderDelivered |
| `.../inventory` | InventoryChanged, InventoryLow, InventoryOutOfStock |
| `.../customers` | CustomerCreated, CustomerUpdated, CustomerDeleted |
| `.../loyalty` | PointsEarned, PointsRedeemed, PointsExpired |
| `.../dashboard` | Aggregated ping / Campaign* / metrics refresh hints |
| `.../notifications` | User-visible notification envelopes |
| `admin/merchants` | MerchantCreated/Activated/Updated (admin) |
| `admin/monitoring` | Health/abuse hooks |

## Message size

Keep payloads lean; clients refetch details via API when needed.

## Failure

If EMQX down: outbox retries; UI falls back to polling. Never block checkout on MQTT publish after commit.

## Implementation package

`src/emqx-realtime/` (ADR-038) — topic catalog, publish port, outbox → EMQX handler.

`src/realtime-client/` (ADR-039) — browser/staff MQTT subscribe + poll fallback.
