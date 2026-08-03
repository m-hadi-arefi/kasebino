# 08 — Real-Time Architecture

## Broker

**EMQX** MQTT for fan-out of domain events to browsers/admin tools.

## Client connection

- Authenticated merchants connect with JWT-derived credentials or short-lived MQTT token minted by backend
- Subscribe only to topics for their `merchantId`
- Platform admin may subscribe to admin topics

## Topic design (high level)

```
mos/{env}/merchant/{merchantId}/sales
mos/{env}/merchant/{merchantId}/orders
mos/{env}/merchant/{merchantId}/inventory
mos/{env}/merchant/{merchantId}/customers
mos/{env}/merchant/{merchantId}/dashboard
mos/{env}/merchant/{merchantId}/notifications
mos/{env}/admin/merchants
mos/{env}/admin/monitoring
```

Payload = canonical event envelope (see event-driven doc).

## UI integration

- Thin realtime client updates TanStack Query caches / Zustand slices
- Always support poll fallback for critical lists if MQTT disconnects

## QoS

- Publish QoS 1
- Idempotent client handling by eventId

## Related

`17-message-broker-architecture.md`, ARD-015

## Implementation package

`src/emqx-realtime/` (ADR-038) — tenant topics, QoS1 publish port, outbox consumer handler, in-memory broker for tests.

`src/realtime-client/` (ADR-039) — MQTT-over-WebSocket client strategy, TanStack Query invalidation, HTTP poll fallback, reconnect backoff, `POST /api/v1/realtime/token`.
