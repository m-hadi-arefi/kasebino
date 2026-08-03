# OpenTelemetry

## Purpose

Tracing/metrics hooks readiness.

## Why chosen

NFR-05; production debugging of checkout path.

## Best practices

- Instrument use cases + HTTP
- Propagate correlationId
- Sampler configurable

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `src/shared/observability`

## Anti-patterns

- High-cardinality labels (raw phone)
- PII in span attributes

## Performance recommendations

- Trace barcode + CompleteSale always in staging

## Security recommendations

- Scrub secrets

## Example architecture usage

Span CompleteSale encompassing DB TX.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
