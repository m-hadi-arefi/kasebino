# React

## Purpose

UI component model for merchant, admin, storefront.

## Why chosen

Ecosystem fit with Next.js; concurrent features for snappy POS.

## Best practices

- Function components only
- Controlled inputs via RHF
- Prefer composition over prop drilling; context sparingly

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `src/modules/*/ui` — module-owned compositions
- `src/components/ui` — shared primitives (shadcn via ADR-019)
- `src/components/composites` — cross-cutting compositions
- `src/components/domain/*` — domain presentational shells
- Contract: `src/frontend-components/` (ADR-018)

## Anti-patterns

- useEffect data fetching when TanStack Query fits (ADR-026 / `src/data-fetching`)
- Mega global store for server state

## Performance recommendations

- Memoize only when profiler says so
- Virtualize long product lists if needed

## Security recommendations

- No dangerouslySetInnerHTML for user content
- Accessible controls mandatory

## Example architecture usage

POS keypad & scan UI as client islands; dashboards mostly RSC+Query.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
