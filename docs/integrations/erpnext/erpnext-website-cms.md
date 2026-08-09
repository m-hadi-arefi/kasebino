# ERPNext Website / CMS

## Purpose

ERPNext’s Website module provides themeable pages, home page composition, blogs, web forms, and optional web shop capabilities for businesses that want a site managed inside Desk.

## Main concepts

| Concept | Typical use |
| --- | --- |
| Website Theme | Look & feel |
| Web Page / Home Page | Content pages |
| Blog Post | Marketing content |
| Web Form | Public forms |
| Website Item / Item Group (web) | Catalog exposure for ERP web shop |
| Portal | Limited customer self-service for ERP users |

## MerchantOS decision

| Capability | Owner | Decision |
| --- | --- | --- |
| Per-store branded storefront URL/QR/PWA | **MerchantOS** | Required Iranian retail UX (ADR-023/086/100) |
| Pickup checkout & membership portal | **MerchantOS** | Core product |
| Generic marketing landing for Kasbino SaaS | **MerchantOS** | ADR-122 |
| ERPNext Website / Blog / Web Shop | **Do not use as MOS storefront** | Commodity; wrong UX & tenancy model |
| Merchant optional blog | **Investigate later** | Prefer MOS CMS or external; not ERP Desk for customers |

### Why not ERPNext Website for merchants

1. **Store-first multi-tenant PWA** is a first-class MOS product; ERP Website is single-site oriented per Company.
2. Persian RTL + Jalali + تومان + Iranian mobile workflows are governed in MOS design system — not Desk themes.
3. Offline staff POS and customer OTP portal must not depend on ERP Website.
4. Coupling public UX to ERP uptime violates retail critical path rules.

**Decision:** Blog/CMS for merchants remains **optional commodity** — default = out of ERPNext scope; revisit only with a dedicated product ADR.

## Related docs

- [ui-strategy.md](./ui-strategy.md)
- ADR-134 UI Strategy
