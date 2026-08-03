# Accessibility

## Standard

WCAG 2.2 AA target for merchant + storefront + landing.

## Requirements

- Keyboard access for all actions
- Focus visible
- Labels on inputs (not placeholder-only)
- `aria-live` for scan/sale success/failure
- Color not sole status indicator
- Hit targets ≥ 44x44px on mobile
- Honor `prefers-reduced-motion`

## POS specifics

- Announce barcode match/no-match
- Error recovery paths reachable by keyboard

## Validation

- axe or equivalent on primary screens
- Lighthouse Accessibility > 90 (landing ≥ 95)
