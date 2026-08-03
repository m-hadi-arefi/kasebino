# Local Deployment

Target (implemented by ARD-001):

```bash
docker compose up --build
```

Services: app, postgres, mongo, redis, emqx, minio.

Copy `.env.example` → `.env` (includes `DATABASE_URL`, `MONGODB_URI`).

Health: `GET /api/health`  
Ready: `GET /api/ready` (Postgres required; Mongo may be degraded-mode per policy)
