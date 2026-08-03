# PWA

## Purpose

Installable offline-capable merchant client.

## Why chosen

Counters use phones; offline P1 requirement.

## Best practices

- Manifest + SW
- Online-first; offline queue isolated
- Version catalog snapshots

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `public/manifest`
- `src/pwa or workers`

## Anti-patterns

- Aggressive cache of authenticated APIs

## Performance recommendations

- Precache shell only

## Security recommendations

- httpOnly cookies preferred over storing JWT in IDB

## Example architecture usage

Offline sale queue with idempotency keys.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
