# Local Deployment

Target (implemented by ARD-001):

```bash
docker compose up --build
```

Services: app, postgres, mongo, redis, emqx, minio.

Copy `.env.example` → `.env` (includes `DATABASE_URL`, `MONGODB_URI`).

Health: `GET /api/health`  
Ready: `GET /api/ready` (Postgres + Redis required; Mongo/EMQX/MinIO optional unless `MOS_READY_REQUIRE_*=1` — see `docs/observability/health-checks.md`)
