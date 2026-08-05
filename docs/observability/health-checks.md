# Health Checks

Ops probes for MerchantOS (ADR-067 liveness, ADR-112 readiness).

## Liveness — `GET /api/health`

- Cheap process-up check: `{ "status": "ok" }`
- No dependency pings
- Dockerfile `HEALTHCHECK` target
- Unauthenticated

## Readiness — `GET /api/ready`

Returns **200** `{ "status": "ready", "checks": { ... } }` or **503** `{ "status": "not_ready", "checks": { ... } }`.

### Policy

| Check | Required by default | Config | Ping |
| --- | --- | --- | --- |
| `postgres` | **yes** | `DATABASE_URL` | `SELECT 1` |
| `redis` | **yes** (auth OTP rate-limit fail-closed) | `REDIS_URL` | `PING` |
| `mongodb` | no (analytics plane) | `MONGODB_URL` | `ping: 1` |
| `emqx` | no (realtime / outbox) | `MQTT_URL` | MQTT connect |
| `minio` | no (receipts/assets fail-open) | `MINIO_ENDPOINT` | ensure `receipts` bucket |

Make an optional check required:

```bash
MOS_READY_REQUIRE_MONGO=1
MOS_READY_REQUIRE_EMQX=1
MOS_READY_REQUIRE_MINIO=1
```

Optional checks with missing config are **skipped** (`skipped: true`, `ok: true`) so local/unit runs without full Compose stay coherent. Missing **required** config → `detail: "missing_config"` → **not_ready**.

### Timeouts

- Per-check ≈ 1500ms; probes run in parallel
- Response never includes URLs, passwords, or connection strings

### Compose / Kubernetes wiring (ADR-118)

Document only here; CD manifests land in ADR-118.

**Compose (app service example):**

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
  interval: 10s
  timeout: 3s
  retries: 3
```

Prefer **readiness** at the load balancer / orchestrator for traffic:

```yaml
# Kubernetes sketch
livenessProbe:
  httpGet: { path: /api/health, port: 3000 }
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /api/ready, port: 3000 }
  periodSeconds: 5
  failureThreshold: 3
```

Local smoke:

```bash
curl -sS http://localhost:3000/api/health
curl -sS -o /tmp/ready.json -w "%{http_code}" http://localhost:3000/api/ready
```
