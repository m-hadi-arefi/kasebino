# Architecture Requirement Documents (ARDs)

ARDs are independently implementable work packages derived from `PRD.md` and additive product docs (`store-first-evolution.md`, analytics-requirements.md).

## Execution streams

### Core product (OLTP)

001 → 002 → 003 → **004 + 032** → 005 → 006 → 007 → **031** → 008 → 009 → 013/015/016/014 → 017 → 018 → 019 → 020

### Storefront & customer ownership

**010 → 030 → 029 → 033 → 011/012 → 034 → 035**

### Analytics / audit (Mongo)

021 → 024 → 022/023/027 → 025/026 → 028

The **ard-to-code** skill selects the first unfinished ARD whose dependencies are `completed`.

## Status board

See [STATUS.md](./STATUS.md).

## Index

| ID | Title | File |
| --- | --- | --- |
| ARD-001 | Project Foundation | [ard-001-project-foundation.md](./ard-001-project-foundation.md) |
| ARD-002 | Authentication (Merchant) | [ard-002-authentication.md](./ard-002-authentication.md) |
| ARD-003 | Merchant Management | [ard-003-merchant-management.md](./ard-003-merchant-management.md) |
| ARD-004 | Store Management | [ard-004-store-management.md](./ard-004-store-management.md) |
| ARD-005 | Product Catalog | [ard-005-product-catalog.md](./ard-005-product-catalog.md) |
| ARD-006 | Inventory | [ard-006-inventory.md](./ard-006-inventory.md) |
| ARD-007 | POS | [ard-007-pos.md](./ard-007-pos.md) |
| ARD-008 | Customer CRM | [ard-008-customer-crm.md](./ard-008-customer-crm.md) |
| ARD-009 | Loyalty | [ard-009-loyalty.md](./ard-009-loyalty.md) |
| ARD-010 | Storefront Experience | [ard-010-storefront.md](./ard-010-storefront.md) |
| ARD-011 | Orders | [ard-011-orders.md](./ard-011-orders.md) |
| ARD-012 | Payments | [ard-012-payments.md](./ard-012-payments.md) |
| ARD-013 | Dashboard | [ard-013-dashboard.md](./ard-013-dashboard.md) |
| ARD-014 | Notifications | [ard-014-notifications.md](./ard-014-notifications.md) |
| ARD-015 | Realtime Layer | [ard-015-realtime-layer.md](./ard-015-realtime-layer.md) |
| ARD-016 | Analytics (Merchant OLTP) | [ard-016-analytics.md](./ard-016-analytics.md) |
| ARD-017 | PWA (Merchant Staff) | [ard-017-pwa.md](./ard-017-pwa.md) |
| ARD-018 | Admin Panel | [ard-018-admin-panel.md](./ard-018-admin-panel.md) |
| ARD-019 | Infrastructure | [ard-019-infrastructure.md](./ard-019-infrastructure.md) |
| ARD-020 | Production Hardening | [ard-020-production-hardening.md](./ard-020-production-hardening.md) |
| ARD-021–028 | Analytics/Mongo suite | see STATUS |
| ARD-029 | Store PWA Platform | [ard-029-store-pwa-platform.md](./ard-029-store-pwa-platform.md) |
| ARD-030 | Customer Identity Platform | [ard-030-customer-identity-platform.md](./ard-030-customer-identity-platform.md) |
| ARD-031 | Customer Membership Domain | [ard-031-customer-membership-domain.md](./ard-031-customer-membership-domain.md) |
| ARD-032 | Store Location & Maps | [ard-032-store-location-and-maps.md](./ard-032-store-location-and-maps.md) |
| ARD-033 | QR Acquisition System | [ard-033-qr-acquisition-system.md](./ard-033-qr-acquisition-system.md) |
| ARD-034 | Pickup Order Flow | [ard-034-pickup-order-flow.md](./ard-034-pickup-order-flow.md) |
| ARD-035 | Customer Dashboard | [ard-035-customer-dashboard.md](./ard-035-customer-dashboard.md) |
