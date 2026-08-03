# 02 — Domain Map

## Purpose

Map MerchantOS business domains, ownership, and data affinity for modular monolith packaging.

## Domains

| Domain | Core question | Upstream deps | Downstream consumers |
| --- | --- | --- | --- |
| Identity | Who is authenticated? | SMS provider | All |
| Merchant | Which business owns data? | Identity | Nearly all |
| Store | Where does selling happen? | Merchant | Catalog, POS, Storefront |
| Catalog | What is sold? | Store | POS, Inventory, Storefront |
| Inventory | How many remain? | Catalog | POS, Storefront, Analytics |
| POS / Sales | What was sold in-store? | Catalog, CRM, Loyalty | Inventory, CRM, Loyalty, Analytics |
| CRM | Who are customers? | Merchant, Sales | Loyalty, Analytics, Campaigns |
| Loyalty | How is value returned? | CRM, Sales | POS, CRM, Analytics |
| Ordering | What was ordered online? | Catalog, Storefront | Inventory, Payments, Analytics, Realtime |
| Payments | Was money captured? | Ordering | Ordering, Analytics |
| Analytics | What is performance? | Sales, Orders, CRM | Dashboard UI |
| Notifications | Who should be told? | Events | Clients, SMS |
| Admin / Platform | Is the platform healthy & fair? | Merchant, Observability | Ops |

## Shared kernel

- `TenantId` (merchantId for MVP)
- `Money` (amount + currency IRR default)
- `PhoneNumber`
- `AuditMeta` (actor, at, action)
- ID generation (UUID v7 preferred if available; UUID v4 acceptable)
- Soft-delete convention

## Ownership rules

1. Only the owning domain mutates its aggregates.
2. Cross-domain effects use domain events or application orchestration with explicit ports.
3. Analytics never mutates sales/orders; read models only.
4. Catalog owns product identity; inventory owns stock quantity separately.

## Packaging (`src/modules/<domain>`)

Each module contains:

```
application/   # use cases
domain/        # aggregates, events, policies
infrastructure/# drizzle repos, adapters
api/           # route handlers / server actions bindings
ui/            # optional feature UI owned by module
```

## Context priority for MVP

Identity → Merchant → Store → Catalog → Inventory → POS → CRM → Loyalty → Ordering → Analytics → Storefront UI → Realtime → PWA → Admin → Hardening
