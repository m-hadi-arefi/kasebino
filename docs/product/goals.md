# Product Goals

## Goals (Phase 1 / MVP)

1. Make checkout fast enough for peak hours.
2. Capture customer identity (phone) as part of every sale **and create store membership**.
3. Build usable CRM from POS/storefront activity without manual data entry.
4. Run a simple loyalty program (points, rewards, coupons, wallet) **visible in customer store PWA**.
5. Give retention-focused analytics (who returns, who lapsed).
6. Offer **dedicated per-store storefront** (URL, QR, branding, installable PWA) with **pickup-only** ordering.
7. Ship as cloud-native SaaS with production-grade ops from day one.
8. Let customers OTP-login, view profile/points/history/rewards/receipts, and navigate to the store.
9. Ship Persian + RTL experiences with Jalali dates and تومان formatting appropriate for Iranian merchants and customers.

## Non-goals (explicitly out of MVP)

- Full double-entry accounting / tax filing **inside MerchantOS** (future: ERPNext owns books; see ERPNext Integration Vision)
- Multi-warehouse logistics / ERP purchasing **as MOS product SoT** (ERPNext-first for purchase)
- Public marketplace / multi-merchant browsing
- Supplier management networks
- Advanced AI recommendations
- Desktop-native offline-first POS hardware suite (PWA offline is enough)
- **Delivery, courier integration, rider fleets, shipping**
- Replacing MOS POS/storefront UI with ERPNext Desk/Website

## ERPNext Integration Vision

MerchantOS provides retail experience, POS, customer engagement, and store operations.  
ERPNext provides ERP/accounting and financial control — via outbox + `AccountingProvider` / `ErpNextAccountingProvider` (ADR-135…140), never by embedding ERP logic in core domains (`docs/integrations/erpnext/`). Never replace MOS UX with ERPNext Desk/Website.

## Milestone mapping

| Milestone | Outcome |
| --- | --- |
| M0 | Foundations, Docker, CI, auth skeleton, DDD folders |
| M1 | Catalog & POS online path |
| M2 | CRM & Loyalty |
| M3 | Analytics |
| M4 | Storefront |
| M5 | PWA & hardening |
| M6 | Landing, staging, launch readiness |

Suggested sequence: **M0 → M1 → M2 → M3/M4 parallel → M5 → M6**.

## ARD alignment

Each goal maps to one or more ARDs in `docs/ards/`. Non-goals must not appear as ARD acceptance criteria without a decision record.
