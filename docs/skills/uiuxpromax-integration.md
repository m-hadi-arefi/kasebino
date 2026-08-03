# uiuxpromax Integration (Mandatory)

## Rule

**Every** UI generation task MUST use **uiuxpromax**.

- Every page must follow uiuxpromax
- Every component must follow uiuxpromax
- Every future AI implementation must invoke uiuxpromax **before** creating UI
- Executable gate: `src/uiuxpromax-gate/` (ADR-021) — `assertUiuxGate`

## When it applies

- New pages/layouts
- New components
- Visual refactors
- Landing, POS, CRM, loyalty, storefront, admin, PWA shells

## Invocation protocol (ard-to-code Step 4)

1. Detect if ARD includes UI surfaces (pages/components)
2. If yes: load and follow uiuxpromax skill instructions fully
3. Read `docs/uiux/*` as input constraints
4. Produce UI plan (screens, states, components) from uiuxpromax output
5. **Brief must specify Persian + RTL** (`lang=fa`, `dir=rtl`, fa-IR persona, Persian copy samples, Iranian retail context, ~390px Android widths)
6. Only then implement UI code
7. If uiuxpromax skill file is missing in the environment, STOP and request the skill — do not improvise a parallel design system
8. If the external uiuxpromax binary is unavailable, satisfy the gate via this skill + `docs/uiux/*` evidence (still STOP if those are missing)

## Non-compliance

UI merged without uiuxpromax is automatically **not Done**.
