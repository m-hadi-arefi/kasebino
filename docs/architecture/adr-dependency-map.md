# ADR Dependency Map

## How to read

- **Node:** `ADR-NNN`
- **Edge:** `A → B` means **A must be completed (or accepted with mocks) before B implementation**
- Full titles in [`/adrs/STATUS.md`](../../adrs/STATUS.md)
- Execution narrative: [adr-roadmap.md](./adr-roadmap.md)

## Spine

```
ADR-001 Product
   ├─► ADR-015 Scope guardrails
   ├─► ADR-002 DDD ► ADR-003 Contexts ► ADR-004 Modular monolith
   │                                      └─► ADR-085 Governance
   ├─► ADR-016 Next.js ► ADR-029 Backend layering
   └─► ADR-014 Analytics boundaries ► ADR-056 Mongo
```

## Data & platform

```
ADR-004
  ├─► ADR-066 Compose
  │     ├─► ADR-041 PostgreSQL ► ADR-042 Drizzle
  │     │     ├─► ADR-043 Modeling ► ADR-044 Indexes ► ADR-045 Queries
  │     │     ├─► ADR-046 Migrations
  │     │     ├─► ADR-047 Integrity
  │     │     └─► ADR-048 Tenancy
  │     ├─► ADR-051 Redis ► ADR-052 Cache-aside ► ADR-053 Keys/TTL ► ADR-054 Invalidation
  │     │                 └─► ADR-055 Rate limiting
  │     ├─► ADR-038 EMQX ► ADR-039 Client strategy
  │     ├─► ADR-040 MinIO
  │     └─► ADR-056 Mongo ► ADR-057 Warehouse
  │                       ├─► ADR-058 Audit
  │                       ├─► ADR-059 Product analytics
  │                       ├─► ADR-060 Clickstream ► ADR-061 Sessions
  │                       ├─► ADR-062 Mgmt analytics
  │                       └─► ADR-064 Retention
  └─► ADR-065 Analytics failure isolation (before relying on Mongo in POS path)
```

## Domain verticals

```
ADR-003
  ├─► ADR-005 Merchant ◄─ ADR-031 Merchant auth ◄─ ADR-033 JWT ◄─ ADR-034 RBAC
  ├─► ADR-006 Store
  │     ├─► ADR-086 Storefront
  │     ├─► ADR-081 QR
  │     └─► ADR-023 Store PWA
  ├─► ADR-008 Catalog/Inventory ► ADR-050 Search/Barcode ► ADR-049 Inventory sync
  ├─► ADR-007 Membership ◄─ ADR-032 Customer OTP
  │     ├─► ADR-009 POS/Sales
  │     ├─► ADR-010 Loyalty
  │     └─► ADR-087 Customer dashboard
  ├─► ADR-011 Pickup ◄─ ADR-082 Pickup-only
  │     └─► ADR-012 Payments ◄─ ADR-084 PSP (proposed)
  ├─► ADR-013 Admin ► ADR-089 Admin dashboard
  └─► ADR-063 Merchant OLTP dashboards ► ADR-088 Merchant dashboard UI
```

## Frontend

```
ADR-016
  ├─► ADR-017 App router
  ├─► ADR-018 Components ► ADR-019 shadcn ► ADR-020 Tailwind ► ADR-021 uiuxpromax
  ├─► ADR-025 State ► ADR-026 Fetching
  ├─► ADR-027 Forms
  ├─► ADR-028 Error UX
  ├─► ADR-022 Staff PWA ► ADR-024 Offline POS
  └─► ADR-023 Store PWA
```

## Events & jobs

```
ADR-029 + ADR-002
  └─► ADR-036 Event-driven ► ADR-037 Catalog governance
        └─► ADR-035 Outbox workers ► (feeds EMQX, Mongo, cache, audit)
```

## Security, quality, ops

```
ADR-034 + ADR-055
  └─► ADR-076 Security ► ADR-077 API protection

ADR-078 Testing ► ADR-079 Layers
ADR-080 Errors

ADR-067 Containers ► ADR-069 CI/CD ► ADR-070 Zero-downtime
ADR-071 Scalability
ADR-072 Topology ► ADR-073 Backup/DR
ADR-074 Observability ► ADR-075 Alerting

ADR-083 SMS provider (proposed) blocks production OTP send
ADR-084 PSP (proposed) blocks live capture
ADR-091 MVP product policies (accepted) bind multi-store, loyalty expiry, consent, tender, pickup timers, path URL, maps, free pilot — apply from foundation modeling onward
```

## Critical prerequisite pairs

| Before | After |
| --- | --- |
| ADR-042 Drizzle | Any OLTP feature schema |
| ADR-034 RBAC | Any tenant mutation API |
| ADR-007 Membership | Loyalty wallet + customer portal |
| ADR-082 Pickup-only | Order UI/API |
| ADR-065 Isolation | Mongo writes from POS path |
| ADR-021 uiuxpromax | Any UI implementation |
| ADR-035 Outbox | Realtime + warehouse reliability |

## Parallelizable sets (when deps satisfied)

1. ADR-043..048 (DB standards)  
2. ADR-017..021 (frontend design system)  
3. ADR-059..061 (product telemetry)  
4. ADR-074..075 with ADR-069..071 (ops hardening)  

## Relationship to ARDs

ADRs decide *what/why*. ARDs in `docs/ards/` package *delivery*. Example:

| ADR | Primary ARDs |
| --- | --- |
| ADR-009 POS | ARD-007 |
| ADR-023 Store PWA | ARD-029 |
| ADR-007 Membership | ARD-031 |
| ADR-056 Mongo | ARD-021 |
| ADR-011 Pickup | ARD-011, ARD-034 |
