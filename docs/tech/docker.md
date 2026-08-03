# Docker

## Purpose

Container packing for app & sidecars.

## Why chosen

Reproducible deploys; horizontal scale.

## Best practices

- Non-root user
- Multi-stage builds
- Healthcheck instruction

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging
- Canonical contract: **`src/containerization/`** (ADR-067) — multi-stage, non-root, standalone, healthcheck, 12-factor, no secrets baked
- Local Compose `app` profile remains bind-mount/dev (ADR-066); prod artifact is the root `Dockerfile`

## Folder conventions

- `Dockerfile at repo root`
- `.dockerignore`
- Health liveness: `GET /api/health` (ready `/api/ready` reserved)

## Anti-patterns

- Baking secrets into images
- Latest tags in prod without digest

## Performance recommendations

- Small images; layer caching

## Security recommendations

- Scan images in CI when available

## Example architecture usage

App image runs Next standalone output.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
