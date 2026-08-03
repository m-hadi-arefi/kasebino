# Product Evolution — Store-First Customer Ownership (2026-08-03)

This addendum extends `PRD.md`. Where conflicts exist, **this addendum + approved ADRs supersede older PRD MVP wording** until PRD version is bumped.

**Product identity:** MerchantOS is an **Iranian-native retail operating system.** Store-first surfaces (storefront, store PWA, membership, pickup, QR) ship Persian + RTL + Jalali + تومان. See `docs/rules/iranian-first-development.md`.

## Store-first principle

Every **store** is a retention surface:

| Ownership | Capability |
| --- | --- |
| Merchant/Store | POS, inventory, CRM, loyalty program, customer base, branded storefront, installable store PWA, QR acquisition |
| Platform | Identity plumbing, multi-tenant isolation, observability — **not** marketplace ownership of customers |

Stores **own** their customer relationships. There is no cross-merchant customer marketplace browsing.

## Mandatory storefront

Every store has its own dedicated storefront with:

1. Public **URL** (path-based MVP: `/s/{storeSlug}` — ADR-091)  
2. **QR code** (encodes storefront / membership deep link)  
3. **Branding** (name, logo, theme colors within design system)  
4. **Installable PWA** (per-store manifest / experience)

## Customer capabilities (MVP)

Customers can:

- Open store URL or scan store QR  
- Install store PWA  
- Login via **SMS OTP** (customer identity — distinct from merchant staff auth)  
- View profile, loyalty points, purchase history, rewards, receipts  
- Become a **member** of a store  
- Navigate to physical store (maps)  
- Place **in-store pickup** orders only  

## Membership (first-class)

`StoreMembership` is a first-class domain concept:

- Customer (global-ish identity by phone) ↔ Store membership  
- Membership carries loyalty wallet scope, history visibility, rewards eligibility  
- POS phone capture creates/links membership atomically with sale  

## Location (mandatory on store)

Every store MUST have:

- Address (structured + display)  
- Latitude / Longitude  
- Map presentation on storefront  
- Navigation deep link (external maps apps)  

## Fulfillment MVP

| In scope | Out of scope |
| --- | --- |
| In-Store Pickup | Delivery |
| Pickup order lifecycle below | Courier / rider fleets |
| | Shipping / logistics networks |

## Pickup order lifecycle (MVP)

```
PendingPayment → Paid → Preparing → ReadyForPickup → PickedUp → Completed
         ↘ Cancelled
Paid/Preparing/ReadyForPickup may also → Refunded (policy) or Cancelled
```

Canonical statuses:

`pending_payment` | `paid` | `preparing` | `ready_for_pickup` | `picked_up` | `completed` | `cancelled` | `refunded`

**Timers (ADR-091):** unpaid → cancel after 30m; ready_for_pickup hold 24h then staff cancel + manual refund.

## Growth loops (documented)

See:

- `docs/product/growth-loops-loyalty.md`
- `docs/product/growth-loops-qr.md`
- `docs/product/growth-loops-store-pwa.md`

## Requirement IDs (additive)

| ID | Requirement | Priority |
| --- | --- | --- |
| SF-10 | Each store has dedicated storefront URL | P0 |
| SF-11 | Storefront branding configurable | P0 |
| SF-12 | Store QR code generated & printable | P0 |
| SF-13 | Store installable PWA | P0 |
| CUST-01 | Customer SMS OTP login | P0 |
| CUST-02 | Customer profile in store context | P0 |
| CUST-03 | Customer views points/history/rewards/receipts | P0 |
| MEM-01 | Store membership first-class; store owns customer base | P0 |
| LOC-01 | Store address + lat/lng mandatory | P0 |
| LOC-02 | Map + navigation on storefront | P0 |
| ORD-10 | MVP fulfillment = pickup only | P0 |
| ORD-11 | Pickup lifecycle statuses as listed | P0 |
| ORD-12 | Checkout redesigned for pickup orders | P0 |

## Explicit non-goals (additive)

- Delivery / courier / rider fleets / shipping  
- Multi-merchant customer discovery marketplace  
