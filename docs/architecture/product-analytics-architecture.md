# Product Analytics Architecture

## Purpose

Measure **how the product is used** to improve activation, retention features, and UX — distinct from merchant financial dashboards (ARD-016).

## Questions answered

- Which features do merchants actually use?  
- Where do activation funnels drop?  
- How long does POS checkout take in the wild?  
- Which storefront steps convert?  
- What correlates with North Star (Monthly Returning Customers)?  

## Tracking model

| Concept | Definition |
| --- | --- |
| Identity | `actorId` when authenticated; else `anonymousId` + later merge |
| Session | `sessionId` spanning app opens until timeout |
| Feature key | Stable string e.g. `pos.camera_scan`, `loyalty.redeem` |
| Properties | Small JSON map; no unbounded free text PII |

## Instrumentation points (mandatory coverage)

| Surface | Events |
| --- | --- |
| Auth | OTP funnel |
| Onboarding | Merchant/store/product firsts |
| POS | Scan, search, capture, checkout timing |
| CRM/Loyalty | Profile open, redeem |
| Storefront | Funnel |
| Dashboards | Widget views |
| Admin | Tool usage (no secret payloads) |

## Privacy

- Do not put raw OTP codes, JWTs, or full payment secrets in properties  
- Phone numbers: prefer hash for product analytics; clear text only when analytically justified and policy-approved  
- Respect soft-deleted customers in joins back to OLTP  

## Storage

MongoDB product collections via analytics ingest. Aggregations may write rollups to `mos_mgmt` or `mos_product_rollups`.

## Feature usage analytics

Each feature key reports:

- Unique merchants using in window  
- Events count  
- Last used at  

## Conversion funnel analytics

Defined funnels in `analytics-architecture.md`. Store step events; compute conversion with session or merchant cohort windows.

## Related

ARD-023 Product Analytics, ARD-027 User Behavior Tracking.
