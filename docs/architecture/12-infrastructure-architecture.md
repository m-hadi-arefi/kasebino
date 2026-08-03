# 12 — Infrastructure Architecture

## Docker Compose services (local parity)

| Service | Image role | Ports (typical) |
| --- | --- | --- |
| app | MerchantOS Next.js | 3000 |
| postgres | PostgreSQL (OLTP) | 5432 |
| mongo | MongoDB (analytics/audit/telemetry) | 27017 |
| redis | Redis | 6379 |
| emqx | EMQX MQTT | 1883, 8083, 18083 |
| minio | MinIO S3 | 9000, 9001 |

## Networks & volumes

- Private bridge network between services
- Named volumes for postgres, mongo, redis persistence (dev optional), minio data

## Production notes

- Prefer managed Postgres/Redis/Mongo when available
- EMQX clustered for HA
- MinIO or S3-compatible object store
- TLS termination at LB / ingress
- Mongo sizing guided by clickstream + warehouse volume; isolate from OLTP hosts when possible
- App image: multi-stage Next standalone Dockerfile at repo root (`src/containerization`, ADR-067); non-root; `GET /api/health` liveness; secrets via env only (ADR-068)

## Backups

- Daily Postgres backups minimum for staging/prod plans
- MongoDB backups per retention/ops runbooks (ARD-019)
- Object versioning optional for receipts
