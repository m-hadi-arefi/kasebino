# shadcn/ui

## Purpose

Accessible base components copied into repo.

## Why chosen

Owned source; composes with Tailwind; Radix a11y.

## Contract

ADR-019 (`src/shadcn-strategy/`): shadcn is the exclusive primitive vendor.
CLI config: root `components.json` (RTL aliases → `@/components/ui`).
Class helper: `src/lib/utils.ts` (`cn` via clsx + tailwind-merge).
Visual tokens: ADR-020 (`app/globals.css`, `src/tailwind-design-system/`).
CLI-generated primitives follow ADR-021 uiuxpromax process. Do not adopt
MUI/Chakra/Ant as the primitive layer.

## Best practices

- Generate via shadcn CLI into src/components/ui (ADR-018 path; ADR-019)
- Wrap for domain-specific props
- Do not fork heavily without need
- RTL-first logical CSS; Persian strings must not clip; keep Radix focus a11y

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `src/components/ui/*` (primitives)
- `src/components/composites` + `src/components/domain/*` + `src/modules/*/ui`
- Legacy `src/shared/ui` superseded — do not generate there

## Anti-patterns

- Styling against Radix internals brittle selectors
- Treating shadcn as black-box npm runtime package incorrectly
- Parallel design systems (MUI, Chakra, Ant Design, …)

## Performance recommendations

- Tree-shake by importing per component

## Security recommendations

- Keep keyboard/focus behaviors intact

## Example architecture usage

Dialogs for payment confirm; forms for product create.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
