# EMQX

## Purpose

MQTT broker for realtime updates.

## Why chosen

Lightweight pub/sub; ACL; fits dashboards/POS monitors.

## Best practices

- Topic design per message-broker doc
- QoS 1 publish
- Never block checkout on publish

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `src/emqx-realtime/` — topics, ACL, publish port, outbox handler (ADR-038)
- `src/infrastructure/emqx/client.ts` — MQTT_URL config stub
- `src/realtime-client/` — MQTT-over-WS client, poll fallback, token API (ADR-039)
- `app/api/v1/realtime/token/route.ts` — short-lived MQTT creds
- Legacy note: `src/shared/infrastructure/mqtt` maps to the above packages

## Anti-patterns

- Overloading payloads with entire aggregates
- Open topics without ACL

## Performance recommendations

- Keep payloads small; clients refetch

## Security recommendations

- Short-lived client creds
- TLS in prod

## Example architecture usage

OrderCreated → merchant orders topic.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
