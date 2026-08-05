# ADR-122 - Marketing Landing Page

| Field | Value |
| --- | --- |
| ID | ADR-122 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Marketing Landing Page

## Context

PRD §13 requires a marketing site with Hero, Features, Benefits, How it works, Screenshots, Pricing, FAQ, CTA, Footer. Current `app/(marketing)/page.tsx` is a two-line Persian stub. Pricing stance is free Kerman pilot (ADR-091). Lighthouse ≥95 required (NFR-08).

## Problem Statement

Launch readiness and merchant acquisition lack a production marketing landing that communicates Kasbino/MerchantOS value in Persian RTL.

## Goals

- Complete Persian RTL landing with all PRD-required sections.
- Pricing section describes پایلوت رایگان کرمان without invented fee tables.
- Lighthouse ≥95 for Performance, SEO, Accessibility, Best Practices.
- CTA to merchant register/login (ADR-095).

## Non Goals

- Blog/CMS.
- English-first marketing site.
- Paid plan matrix for post-pilot (architecture may mention future).

## Functional Requirements

- FR-1: Sections: Hero, Features, Benefits, How it works, Screenshots, Pricing, FAQ, CTA, Footer.
- FR-2: Persian SEO metadata (title/description/og).
- FR-3: Mobile-first Iranian Android-class layout.
- FR-4: Brand-forward composition (Kasbino/MerchantOS identity).
- FR-5: Meet NFR-08 Lighthouse gates (verified with ADR-117).

## Technical Design

1. Expand `(marketing)` route with composed sections; uiuxpromax brief first.
2. Use ADR-114 primitives sparingly; prefer one coherent composition (not dashboard cards soup).
3. Static content OK in code/MDX; optimize images.
4. Link CTAs to `/register` or `/login`.

## Database Changes

- None.

## Backend Changes

- None required (static).

## Frontend Changes

- Full landing implementation under `app/(marketing)`.

## Admin Changes

- None.

## API Changes

- None.

## Security Considerations

- No unchecked third-party scripts that break CSP (ADR-119).
- External asset integrity.

## Edge Cases

- Slow networks - prioritize LCP hero text/brand.
- Reduced motion preferences.

## Acceptance Criteria

- [ ] All PRD §13 sections present in Persian RTL.
- [ ] Pricing states free Kerman pilot without fake fee tables.
- [ ] CTA navigates to merchant auth.
- [ ] Lighthouse ≥95 thresholds measured (ADR-117 job or documented local evidence).
- [ ] uiuxpromax brief archived/linked in plan notes.

## Rollout Plan

Can parallelize early; polish after visual assets exist.

## Dependencies

- ADR-021, ADR-020, ADR-114, ADR-095 (CTA targets), ADR-117 (gates), ADR-091 (pricing copy)

## Risks

- Generic AI aesthetic - follow project frontend design rules and uiuxpromax output.

## Related Documents

- `PRD.md` §13, NFR-08
- `docs/product/business-model.md`
- ADR-091 pricing stance

## Iranian User Experience Requirements

- Fully Persian + RTL; Iranian retail language; Vazirmatn.
- uiuxpromax mandatory; Iranian feature checklist.

## Estimated Complexity

**M**
