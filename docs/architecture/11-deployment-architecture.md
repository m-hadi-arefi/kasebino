# 11 — Deployment Architecture

## Environments

| Env | Purpose |
| --- | --- |
| development | Docker Compose full stack |
| staging | Prod-like; SMS sandbox/mocks as needed |
| production | Multi-instance app + managed/composed data plane |

## App

- Stateless Next.js containers
- N ≥ 2 instances in production
- Load balancer with health checks (**no sticky session affinity required**)
- Rolling / blue-green for zero downtime
- Migrations run as init/job before new traffic (**Drizzle Kit** migrate against PostgreSQL)
- App instances remain stateless; pool connections per instance to Postgres
- Shared Redis / Postgres / Mongo / EMQX across instances (JWT sessions — ADR-033)

**Binding contract:** `src/scalability-stateless/` (ADR-071 / NFR-02). Zero-downtime expand/contract detail → ADR-070; data-plane HA → ADR-072.

## Config

- Env vars for all endpoints/secrets (including `DATABASE_URL`)
- Feature flags for premium/P1 features

## Release gate

- CI (ADR-069): GitHub Actions `.github/workflows/ci.yml` on PR — `npm run validate` (typecheck + lint + test) then `npm run build`
- Binding contract: `src/cicd-strategy/` (gates, no secrets in logs, no skip hooks, CD staging→prod with approvals)
- Drizzle migrations reviewed (locks, indexes, expand/contract) before merge; apply job → ADR-070
- smoke: auth OTP dev, health, ready
- No apply if migrations unsafe without backup plan
