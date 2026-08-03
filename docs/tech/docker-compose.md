# Docker Compose

## Purpose

Local/staging-like multi-service stack.

## Why chosen

Parity for Postgres (OLTP) / Redis / EMQX / MinIO / MongoDB (analytics plane).

## Best practices

- Named volumes
- Depends_on + healthchecks
- env files not committed with secrets

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `docker-compose.yml`
- `compose override for dev`

## Anti-patterns

- Binding all ports publicly on untrusted networks

## Performance recommendations

- Resource limits optional in dev

## Security recommendations

- Separate networks if exposing admin UIs

## Example architecture usage

Developer runs full stack with one command.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
