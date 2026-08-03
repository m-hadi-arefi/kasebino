# Zustand

## Purpose

Client UI state (POS cart, ephemeral UI) per **ADR-025**.

## Why chosen

Simple, small API; not for server truth. Server lists belong to TanStack Query (`src/data-fetching`, ADR-026).

## Best practices

- POS cart in Zustand (`createPosCartStore` in `src/state-management` / `src/modules/pos/ui/state`)
- Prefer `useState` / Context for local UI before adding a store
- Never mirror entire backend into Zustand
- Persist cart cautiously
- URL search params for filters / deep links (not Zustand)

## Project conventions

- Strategy contract: `src/state-management/` (ADR-025)
- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging
- Redux is **not** mandated

## Folder conventions

- `src/state-management` — ownership contract + cart factory
- `src/modules/pos/ui/state` — POS UI re-export / hooks shell

## Anti-patterns

- Fetching in Zustand
- Mega store across domains
- Mirroring API list caches into Zustand

## Performance recommendations

- Keep state minimal for re-renders

## Security recommendations

- Clear cart on logout (`clearOnLogout`)

## Iranian First

- Preserve Unicode Persian product names / phone drafts in cart lines
- Money as integer minor units; display **تومان** in presentation

## Example architecture usage

Cart lines + selected customer phone draft.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.  
Related ADR: ADR-025; fetching: ADR-026.
