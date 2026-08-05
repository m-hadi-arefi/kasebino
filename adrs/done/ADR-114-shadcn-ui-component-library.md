# ADR-114 - Generate shadcn/ui Primitives and Domain Components

| Field | Value |
| --- | --- |
| ID | ADR-114 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Generate shadcn/ui Primitives and Domain Components

## Context

`components.json` is configured (RTL new-york) but `src/components/ui` and domain folders are empty `.gitkeep` only. Feature UIs currently hardcode one-off markup.

## Problem Statement

Without reusable RTL-safe primitives, MVP screens will be inconsistent, inaccessible, and slow to build.

## Goals

- Install shadcn primitives needed for MVP forms/navigation/feedback.
- Shared Persian form controls: phone, تومان money, Jalali date display helpers.
- Domain composites folders populated for POS/CRM/storefront building blocks.

## Non Goals

- Building all final feature pages inside this ADR.
- Inventing a second design system.

## Functional Requirements

- FR-1: Button, Input, Label, Dialog, Sheet, Tabs, Table, Badge, Toast/Sonner, Select, Checkbox, Card (only where interaction needs it).
- FR-2: RTL-safe primitives; touch targets ≥44px.
- FR-3: Phone keypad / toman display / status chip composites.
- FR-4: Tokens align with Tailwind design system (ADR-020).

## Technical Design

1. `npx shadcn@latest add ...` into configured paths.
2. Wrap with MerchantOS CSS variables from `globals.css`.
3. Add Jalali/toman utility components consuming existing `forms-validation` helpers where present.
4. uiuxpromax still required before major screens that compose these primitives.

## Database Changes

- None.

## Backend Changes

- None.

## Frontend Changes

- Primatives + composites under `src/components/**`.

## Admin Changes

- Admin screens consume same primitives.

## API Changes

- None.

## Security Considerations

- Avoid `dangerouslySetInnerHTML` in composites.
- Checkbox/consent components must be accessible.

## Edge Cases

- SSR/CSR mismatch on toasts.
- Vazirmatn metrics with dense tables.

## Acceptance Criteria

- [ ] shadcn primitives committed and importable.
- [ ] Sample Story/page or unit smoke proves RTL layout.
- [ ] Phone and toman composites render Persian-ready defaults.
- [ ] Empty `.gitkeep`-only UI dirs no longer block feature ADRs.

## Rollout Plan

Land early so ADR-095+ UIs depend on it.

## Dependencies

- ADR-018, ADR-019, ADR-020, ADR-021, ADR-027

## Risks

- Over-generating unused components - add only MVP set.

## Related Documents

- ADR-019
- `components.json`

## Iranian User Experience Requirements

- RTL first; Persian placeholders; toman/phone helpers.
- Obey Iranian First checklist for composite demos.

## Estimated Complexity

**M**
