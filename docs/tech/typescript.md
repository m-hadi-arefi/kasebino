# TypeScript

## Purpose

Type-safe domain and application code.

## Why chosen

Eliminates class of bugs; enables strict DDD modeling.

## Best practices

- strict: true
- No any except escaped & justified
- Discriminated unions for statuses
- Branded types for IDs preferred

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `src/modules/*/domain/*.ts pure`
- `Shared types in src/shared/types`

## Anti-patterns

- as unknown as T casts
- Enum overuse when unions suffice

## Performance recommendations

- Prefer type imports
- Keep domain free of framework types

## Security recommendations

- Validate at boundaries; don't rely on types alone

## Example architecture usage

SaleStatus = 'created'|'completed'|'canceled' unions across layers.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
