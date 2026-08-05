# Application composition root (ADR-123)

Single wiring surface for MerchantOS App Router handlers, Auth OTP runtime, and the outbox worker.

## Entrypoints

| Binding | Import | When |
| --- | --- | --- |
| **Production App Context** | `createAppContext` / `getApiContext` from `src/infrastructure/composition` | Next.js App Router routes, RSC loaders (`getApiContext` singleton) |
| **Test App Context** | `createApiContext({ repos: InMemory* })` | Unit / contract HTTP tests |
| **Production repositories** | `createProductionRepositories` / `getSharedProductionRepositories` | Drizzle-only OLTP adapters; shared by API + OTP in-process |
| **Worker** | `createOutboxWorkerRuntime` → same `createProductionRepositories` from composition | ADR-109 long-running process (own process singleton) |

Alias: `createProductionApiContext` ≡ `createAppContext` (kept for older call sites / docs).

## Production vs test

- **Production:** `createAppContext(env)` asserts composition env (`DATABASE_URL`; full ADR-068 keys when `NODE_ENV` is production/staging), rejects Console SMS as default, and requires `MOS_ALLOW_SANDBOX_PAYMENT_GATEWAY=1` when `MOS_ENV=production` still using sandbox PSP.
- **Planes:** Redis / Mongo / MinIO / MQTT use existing mode flags (`MOS_REDIS_MODE=memory`, `MOS_MONGO_MODE=memory`, `MOS_MINIO_MODE=memory`, `MOS_MQTT_MODE=memory`) for degraded / test paths.
- **Tests:** inject InMemory repositories via `createApiContext` / `setApiContextForTests`; never call `createAppContext` unless `DATABASE_URL` is intentional.

## How to add a new module binding

1. Add a Drizzle adapter and register it in `createProductionRepositoriesFromDb` (`src/infrastructure/persistence/create-production-repositories.ts`).
2. Wire the use-case factory inside `createApiContext` (accept optional overrides for tests).
3. Expose the use cases on `ApiContext`; App Router handlers call `getApiContext()`.
4. If the outbox worker needs the port, bind from `ProductionRepositories` in `createOutboxWorkerRuntime` (same factory — do not construct a parallel Drizzle client).

## Next.js singleton caveat

`getApiContext` and `getSharedProductionRepositories` store their singletons on `globalThis` so Fast Refresh / HMR does not open unbounded Postgres pools in development. Worker and web remain separate Node processes (separate singletons — expected).

## Related

- ADR-029 layering · ADR-068 secrets · ADR-093 repos · ADR-094 HTTP · ADR-109 worker  
- Plan: `docs/execution/plans/ADR-123.md`
