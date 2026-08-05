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
- `src/infrastructure/emqx/client.ts` — MQTT_URL config + `MOS_MQTT_MODE`
- `src/infrastructure/emqx/mqtt-publisher.ts` — live mqtt.js `EmqxPublishPort` (ADR-109)
- `src/workers/outbox-worker.ts` — Compose `worker` profile polls outbox → EMQX
- `src/realtime-client/` — MQTT-over-WS client, poll fallback, token API (ADR-039 / ADR-124)
- `app/api/v1/realtime/token/route.ts` — short-lived MQTT creds (session + active store)
- Legacy note: `src/shared/infrastructure/mqtt` maps to the above packages

## Browser client (ADR-124)

- Preferred transport: **MQTT over WebSocket** to EMQX (`ws://localhost:8083/mqtt` locally).
- Token: `POST /api/v1/realtime/token` (merchant session + owned active store; never trust `x-merchant-id`).
- Staff hook: `useRealtimeStoreChannel` on pickup board / POS / notifications.
- Poll fallback interval: **15s** when MQTT disconnects or `NEXT_PUBLIC_MOS_MQTT_CLIENT=0`.
- Behind reverse proxies, forward the EMQX WS listener path `/mqtt` (TLS → `wss`).

## Local worker

```bash
docker compose up -d postgres emqx redis
docker compose --profile worker up worker
# or host: DATABASE_URL=... MQTT_URL=mqtt://localhost:1883 npm run worker:outbox
```

Tests default to `InMemoryMqttBroker` (`MOS_MQTT_MODE=memory`).
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
