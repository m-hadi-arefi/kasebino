---
name: uiuxpromax-integration
description: >-
  Enforces MerchantOS uiuxpromax gate before any UI work. Use when building
  pages/components or when ard-to-code Step 4 runs.
---

# uiuxpromax Integration Gate

## Mandatory rule

Every UI generation task MUST use **uiuxpromax**.

Every page, component, and future AI UI implementation must invoke uiuxpromax **before** creating UI.

Executable contract: `src/uiuxpromax-gate/` (ADR-021) — call `assertUiuxGate` conceptually before UI code.

## Protocol

1. Open and follow the **ui-ux-pro-max** skill (available at `.agents/skills/ui-ux-pro-max/` or as a project skill).
2. Read:
   - `docs/uiux/uiux-system.md`
   - `docs/uiux/design-system.md`
   - `docs/uiux/design-rules.md`
   - `docs/uiux/component-library.md`
   - `docs/uiux/accessibility.md`
   - `docs/uiux/mobile-first.md`
   - `docs/uiux/pwa-experience.md` when PWA/offline
3. Produce a **Persian + RTL brief** before code:
   - `lang=fa` / `dir=rtl` compositions
   - Persian copy samples + fa-IR persona
   - Iranian retail context (مغازه، صندوقدار، مشتری)
   - Mobile mockups at ~390px Android widths for merchant/customer journeys
   - Screen list, states (loading/empty/error with Persian copy), component map, a11y notes
4. Implement UI only after that plan exists.
5. If uiuxpromax / this skill is missing: STOP and notify the user.
6. If the external uiuxpromax binary is unavailable: use this skill + `docs/uiux/*` as evidence — never invent a parallel design system.

## Non-compliance

Any UI without this gate fails Definition of Done.
