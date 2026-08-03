# UI/UX System

## Mandate

Every UI generation task **MUST** invoke the **uiuxpromax** skill before producing pages or components. No exceptions for "small" UI.

See `docs/skills/uiuxpromax-integration.md`.

## Surfaces

| Surface | Users | Priority traits |
| --- | --- | --- |
| Marketing landing | Prospects | Brand hero, Lighthouse ≥ 95 |
| Merchant app | Owner/employee | Speed, mobile-first, POS density |
| Public storefront | End customers | Trust, simple catalog/checkout |
| Platform admin | Ops | Clarity, monitoring density |

## Composition principles

1. One job per screen/section
2. POS is a speed surface — minimize taps
3. Brand-first on marketing; product-utility-first on merchant app
4. No decorative card spam; cards only when containing interaction
5. Motion intentional (2–3 patterns), not noisy
6. Follow `design-rules.md` and repo frontend design rules when applicable

## AI workflow for UI

1. Load uiuxpromax (MerchantOS gate: `src/uiuxpromax-gate/`, ADR-021)
2. Read design-system + design-rules + accessibility + mobile-first (+ component-library / PWA as needed)
3. Produce a Persian + RTL brief (fa-IR persona, `dir=rtl`, Iranian retail context, ~390px mobile)
4. Produce wire intent → components → implement
5. Validate a11y + responsive + Lighthouse budgets for ARD
