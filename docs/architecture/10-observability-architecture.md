# 10 — Observability Architecture

## Pillars

1. **Logs** — structured JSON: level, msg, merchantId, correlationId, route, duration
2. **Metrics** — request rate/latency, OTP success, sale completion, cache hit ratio, outbox lag, **Mongo ingest lag/errors**
3. **Traces** — OpenTelemetry-ready spans across use case → PostgreSQL (Drizzle) → Redis → EMQX → **Mongo ingest**
4. **Health** — `/api/health` liveness; `/api/ready` checks Postgres (+ Redis); **Mongo optional degraded mode** documented
5. **Errors** — centralized error monitoring hook (provider selectable)
6. **Product/ops correlation** — same `correlationId` on domain events, warehouse docs, audit docs, and traces (ARD-028)

## Correlation

Generate `correlationId` per request; propagate to:

- structured logs  
- domain event envelope  
- Mongo analytics/audit/warehouse documents  
- OTel baggage/attributes (no PII)  

## Golden signals for MerchantOS

- POS p95 latency
- Barcode lookup p95
- Checkout success rate
- OTP verify success rate
- Cache hit rate (products, analytics)
- Outbox lag / failed publishes
- EMQX disconnect rate on clients
- **Warehouse mirror lag**
- **Analytics ingest error rate**
- **Mongo availability**

## Relationship to analytics & security monitoring

| Concern | System |
| --- | --- |
| Merchant financial dashboards | ARD-016 PostgreSQL |
| Product/platform analytics | Mongo ARD-021+ |
| Security alerts | ARD-026 + EMQX admin topics |
| Deep audit evidence | ARD-022 |

Observability explains *system health*; analytics explains *product behavior*; audit explains *who did what*.

## Implementation guidance

- Instrument at application service boundaries
- Never log OTP codes or full JWTs
- PII minimization: phone hashing/masking in logs where possible
- Mongo downtime must not fail OLTP ready if policy is degraded-mode (document clearly)

See ARD-028 for delivery of the unified program.
