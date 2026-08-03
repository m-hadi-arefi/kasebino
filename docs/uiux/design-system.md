# Design System

## Direction

MerchantOS visual language: **modern retail utility** — clear, fast, daylight-friendly for shop counters. Avoid generic AI purple gradients and cream/terracotta clichés unless an approved brand ADR says otherwise.

## Tokens (CSS variables — implement in globals)

Define:

- `--color-bg`, `--color-surface`, `--color-fg`, `--color-muted`
- `--color-primary`, `--color-primary-fg`
- `--color-success`, `--color-warning`, `--color-danger`
- `--color-border`
- `--radius-sm|md|lg`
- `--shadow-sm` (use sparingly)
- `--font-sans`, `--font-display` (expressive but readable; not Inter/Roboto/Arial default stacks for marketing)
- Spacing scale: 4-based

Exact brand palette may be finalized in an ADR; tokens must exist before UI ARDs ship.

## Typography

- Merchant app: highly legible sans for data-dense POS
- Marketing: expressive display + clear body
- Minimum 16px body on mobile inputs (prevents iOS zoom)

## Components baseline

Built on shadcn/ui primitives; compositions documented in `component-library.md`.

## Iconography

Consistent stroke set; no emoji as primary UI icons.
