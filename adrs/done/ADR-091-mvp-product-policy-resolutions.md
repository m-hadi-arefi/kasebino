# ADR-091 — MVP Product Policy Resolutions (PRD §19)

| Field | Value |
| --- | --- |
| ID | ADR-091 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

Resolves open product questions from `PRD.md` §19 and related assumptions (legacy notes ADR-0003/0004/0006 in `docs/decisions/`).

## Context

Architecture ADRs 001–090 exist, but several product behaviors remained open and would cause rework if coded differently by agents. Human workshop on 2026-08-03 locked the defaults below.

## Problem Statement

Without explicit MVP product policies for multi-store, loyalty expiry, phone consent UX, POS tender recording, pickup timeouts, storefront URL, maps, and Phase-1 pricing stance, implementers invent conflicting behavior.

## Decision

### 1. Multi-store (PRD Q3)

**Full multi-store in MVP.** A merchant may own multiple stores. Each store has its own inventory, branding, QR, storefront URL/PWA, and membership/loyalty wallet scope. Merchant UI must support create/list/switch/manage stores. RBAC and tenant queries are store-scoped where operational data is store-owned.

### 2. Loyalty expiry (PRD Q4)

**Default:** points expire **12 months after the member’s last earn event** at that store membership. Merchants may configure the expiry window (and disable expiry) per store/program. `PointsExpired` jobs must be scheduled; ledger remains append-only.

### 3. Customer phone consent (PRD Q6)

| Surface | Policy |
| --- | --- |
| POS | Short Persian notice visible at phone capture; **continuing checkout = consent** (no extra mandatory checkbox on the critical path) |
| Customer PWA / storefront OTP | **Explicit checkbox** required before OTP send/verify |
| Platform | Soft delete + audit; merchant-facing privacy/terms links; counsel may tighten copy later without changing UX pattern |

### 4. POS tender recording

Record tender type on each in-store `Sale`: `cash` | `card_terminal` | `mixed`. Card/POS terminal settlement is **out of MerchantOS** (no mandatory card-acquiring integration in MVP). Online pickup payments remain via `PaymentGateway` port (ADR-084 still Proposed; sandbox/mock until accepted).

### 5. Pickup time policies

| Rule | Default |
| --- | --- |
| Unpaid order timeout | `pending_payment` → auto-`cancelled` after **30 minutes** |
| Ready-for-pickup hold | `ready_for_pickup` auto-expire after **24 hours** → staff workflow: cancel + **manual** refund decision |
| No-show | No silent refund; staff cancels; refund is explicit action |

Timers are system defaults; store-level override may be added later without changing MVP defaults.

### 6. Storefront URL

**Path-based only for MVP:** `https://{app-host}/s/{storeSlug}`. Global unique `storeSlug`. QR encodes this canonical URL (+ `?src=qr`). Subdomains are Phase-2+ (no MVP dependency).

### 7. Store map presentation

Persist structured address + lat/lng. Storefront shows a **static map image** (provider adapter) plus a **Navigate** control opening external maps deep links (Google / Neshan / Apple / `geo:` as available). No mandatory interactive map embed in MVP.

### 8. SMS / PSP vendors (PRD Q1–Q2)

Remain **Proposed** (ADR-083, ADR-084). Implement ports + console/dev SMS adapter + payment sandbox. Production adapters blocked until those ADRs are Accepted.

### 9. Phase-1 monetization stance

**Kerman pilot: free for merchants** (no charged SaaS fee / tx fee enforced in product). Instrument GMV/DAM/MAM for later pricing. Landing Pricing section may describe “پایلوت رایگان کرمان” without locked fee percentages. Architecture still keeps fee/credit extension points (ADR-012 / business model) inactive in pilot.

### 10. Offline conflicts (PRD Q5)

Restate ADR-024: online path is P0; offline queue P1; sync conflicts on stock shortage = **reject-and-review** with idempotent sync keys. No new decision.

## Why This Decision / Rationale

Unblocks consistent UX and schema for ard-to-code without waiting for vendor contracts or counsel final copy. Matches Iranian retail (cash/card terminal at counter, SMS-first customer auth, pickup at store) while preserving North Star (membership + return loops).

## Alternatives Considered

- Single-store MVP only — rejected; user chose full multi-store.
- No loyalty expiry — rejected; 12 months from last earn chosen.
- Explicit consent checkbox on POS — rejected for peak-hour speed; notice + continue.
- Integrate card-acquiring in MVP — rejected as out of scope complexity.
- Subdomain storefronts day one — rejected for SSL/PWA ops cost.
- Interactive Neshan/Google embed required — rejected; static + navigate is enough.

## Tradeoffs

- Full multi-store increases onboarding and RBAC surface early.
- Implicit POS consent needs clear, readable Persian notice and future legal review.
- Manual refund on pickup no-show needs good staff UX to avoid money/stock drift.
- Free pilot delays revenue validation.

## Consequences

- Binding for all implementation via ard-to-code.
- PRD §19 marked resolved against these policies.
- Related ADRs (005/006/009/010/011/023/024/032/082/086) implement details consistent with this ADR; contradicting defaults require a superseding ADR.

## Technical Impact

- Schema: merchants 1→N stores; sale.tenderType; loyalty expiry config + job; order expiry jobs; static map object/URL fields optional.
- Routes: `/s/[storeSlug]/…`
- Jobs: unpaid pickup cancel; ready_for_pickup SLA; points expiry.
- Consent flags on membership/customer OTP records.

## Domain Impact

Store aggregation under merchant; membership/loyalty remain store-scoped; Order timeout/refund policies; Sale tender VO.

## Analytics Impact

Track multi-store activation, consent surface, tender mix, pickup timeout cancels, loyalty expiry volume; pilot free → monetization events deferred.

## Security Impact

Consent audit trail (POS notice version / PWA checkbox); public storefront path rate limits unchanged.

## Implementation Requirements

Reflect in ARD-003–004, 007–012, 029–035, 009 loyalty ARDs as relevant; update product assumptions and architecture docs listed below.

## Technical Specifications

See `docs/architecture/storefront-pwa-architecture.md`, `pickup-order-architecture.md`, `store-location-architecture.md`, `customer-membership-architecture.md`, `docs/product/business-model.md`, `docs/product/assumptions.md`.

## Dependencies

**Prerequisites:** ADR-001, ADR-015  

## Related ADRs

ADR-005, ADR-006, ADR-007, ADR-009, ADR-010, ADR-011, ADR-012, ADR-024, ADR-032, ADR-082, ADR-083, ADR-084, ADR-086

## Related Documents

`PRD.md` §19; `docs/product/store-first-evolution.md`; `docs/decisions/README.md`

## Migration Plan

Greenfield: treat as binding from ADR-001 onward for modeling choices. Update STATUS when policies are realized in code with their dependent ADR implementations (this ADR may stay `todo` until core dependents land, or complete when docs+guards in foundation encode the policies).

## Testing Requirements

- Multi-store isolation tests (inventory, membership wallet, slug).
- Loyalty expiry unit tests (12m from last earn; config override).
- POS path has notice; customer OTP blocked without checkbox.
- Unpaid order auto-cancel at 30m; ready hold 24h behavior.
- Sale rejects unknown tender types outside enum.

## Operational Requirements

Scheduled workers for order/loyalty timeouts; runbooks for manual refund after pickup expire.

## Security Considerations

Version Persian consent copy; audit acceptance; never log full OTP.

## Performance Considerations

POS consent must not add blocking network calls; static map cached via MinIO/CDN.

## Future Evolution

Subdomains; card-acquiring; counsel-approved privacy policy; store-configurable pickup timers; paid plans after pilot.

## Iranian User Experience Requirements

- **Persian localization impact:** Consent notice, tender labels (نقد / کارت‌خوان / ترکیبی), pickup timeout messages, pilot pricing copy in Persian.
- **RTL requirements:** All consent and timeout UIs RTL.
- **Mobile usability impact:** POS notice readable at arm’s length; PWA checkbox large touch target; navigate affordance thumb-friendly.
- **Iranian business workflow impact:** Cash/card-terminal recording without forcing PSP; free Kerman pilot; SMS OTP with explicit digital consent.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed when UX in scope
- [x] Decision reflected in code and docs
- [x] PRD §19 points here
- [x] Dependent domain ADRs encode these defaults
- [x] `adrs/STATUS.md` marked appropriately
