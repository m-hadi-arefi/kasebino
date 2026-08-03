# Product Overview — MerchantOS

## What it is

**MerchantOS** is an **Iranian-native retail operating system** — a Customer Retention Operating System for local Iranian retail. It turns anonymous cash-register sales into owned customer relationships by capturing identity at the point of sale and powering loyalty, CRM, analytics, and a lightweight storefront.

**Tagline:** Customer Retention Operating System for Local Retail

**Phase 1 market:** Local retail businesses in Kerman, Iran (mobile shops, fashion, cosmetics, shoes, accessories).

**UX law:** Persian + RTL + Jalali + تومان + Iranian workflows are mandatory (`docs/rules/iranian-first-development.md`).

## Problem

Local retailers sell anonymously. They do not know who bought what, when, or who will return. Loyalty is informal, marketing is untargeted, and growth depends on foot traffic.

Existing tools fail:

| Category | Failure mode |
| --- | --- |
| Accounting | Tracks money, not customers |
| ERP | Too heavy for the counter |
| Marketplaces | Own the customer |
| Generic CRM | Not wired into checkout |

**Core insight:** Retention starts at POS. If identity is not captured during checkout, every later retention tactic fails.

## Vision & mission

- **Vision:** Enable every local merchant to know their customers, increase repeat purchases, and grow revenue through data-driven engagement.
- **Mission:** Transform local retail from anonymous transactions into customer relationships.

## Product principle

| MerchantOS is NOT | MerchantOS IS |
| --- | --- |
| Accounting software | A customer retention engine |
| ERP | Powered by POS transactions |
| Marketplace | Owned by the merchant |

## MVP capability summary

1. Phone + OTP authentication (merchant **and** customer audiences)
2. Fast POS with barcode/camera/fuzzy search + customer phone → **store membership**
3. CRM from POS/storefront (profiles, history, segments) — **store-owned**
4. Loyalty (points, rewards, coupons, wallet) per membership; customer-visible in store PWA
5. **Dedicated store storefront**: URL, QR, branding, installable PWA, map/nav
6. **Pickup-only** online orders with full pickup lifecycle
7. Customer portal: profile, points, history, rewards, receipts
8. Retention analytics + cloud-native ops

## Final product goal

Become the operating system for local retail by turning every sale into customer intelligence and every customer interaction into future revenue.

## Traceability

All implementation work is governed by ARDs derived from this product definition. See `docs/ards/` and `AGENT.md`.
