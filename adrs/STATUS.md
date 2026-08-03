# ADR Implementation Status Board

> **Classification standard (confirmed 2026-08-03):**  
> **ADR done** = Decision realized as architecture contracts / domain modules / tests (`ard-to-code` DoD).  
> **ARD delivery** (HTTP routes, Kit migrations, live infra SDKs, full UI) may still be open — tracked in `docs/ards/STATUS.md` and `adrs/tasks/`.  
> Folders: [`done/`](./done/) · [`future/`](./future/) · [`tasks/`](./tasks/) · Moves: [`REORGANIZATION_INDEX.md`](./REORGANIZATION_INDEX.md) · Audit: [`../AUDIT_REPORT.md`](../AUDIT_REPORT.md)

## Legend

| Runtime note | Meaning |
| --- | --- |
| `complete` | ADR folder `done/` — contract/domain/tests landed |
| `none` | ADR folder `future/` — not started (or Proposed vendor) |
| `task` | Audit gap ADR in `tasks/` — product/runtime wiring still needed |

Decision status remains orthogonal: `Proposed` \| `Accepted`.

---

## done/ — Fully implemented as ADR contracts (81)

| ID | Title | Decision | ADR impl |
| --- | --- | --- | --- |
| ADR-001 | Product Architecture — Store-First Retention OS | accepted | complete |
| ADR-002 | Domain-Driven Design Strategy | accepted | complete |
| ADR-003 | Bounded Context Design | accepted | complete |
| ADR-004 | Modular Monolith Strategy | accepted | complete |
| ADR-005 | Merchant Domain | accepted | complete |
| ADR-006 | Store Domain — Location Branding Slug | accepted | complete |
| ADR-007 | Customer Membership Model | accepted | complete |
| ADR-008 | Catalog and Inventory Domain | accepted | complete |
| ADR-009 | POS and Sales Domain | accepted | complete |
| ADR-010 | Loyalty Architecture | accepted | complete |
| ADR-011 | Pickup Order Architecture | accepted | complete |
| ADR-012 | Payment Domain | accepted | complete |
| ADR-013 | Admin Domain | accepted | complete |
| ADR-014 | Analytics Domain Boundaries OLTP vs Mongo | accepted | complete |
| ADR-015 | MVP Scope Guardrails and Non-Goals | accepted | complete |
| ADR-016 | Next.js Application Architecture | accepted | complete |
| ADR-017 | App Router Structure | accepted | complete |
| ADR-018 | Frontend Component Architecture | accepted | complete |
| ADR-019 | shadcn/ui Strategy | accepted | complete |
| ADR-020 | Tailwind Design System Strategy | accepted | complete |
| ADR-021 | uiuxpromax Mandatory for UI | accepted | complete |
| ADR-022 | Merchant Staff PWA Architecture | accepted | complete |
| ADR-023 | Store Customer PWA Architecture | accepted | complete |
| ADR-024 | Offline-First Staff POS Strategy | accepted | complete |
| ADR-025 | State Management Strategy | accepted | complete |
| ADR-026 | Data Fetching Strategy | accepted | complete |
| ADR-027 | Form and Validation Strategy | accepted | complete |
| ADR-028 | Frontend Error Handling UX | accepted | complete |
| ADR-029 | Backend Clean Architecture Layering | accepted | complete |
| ADR-030 | API Architecture and Standards | accepted | complete |
| ADR-031 | Merchant Authentication Architecture | accepted | complete |
| ADR-032 | Customer SMS OTP Authentication | accepted | complete |
| ADR-033 | NextAuth JWT Strategy | accepted | complete |
| ADR-034 | Authorization RBAC Model | accepted | complete |
| ADR-035 | Background Jobs and Transactional Outbox | accepted | complete |
| ADR-036 | Event-Driven Architecture | accepted | complete |
| ADR-037 | Event Naming and Schema Governance | accepted | complete |
| ADR-038 | EMQX Event Bus / Realtime Architecture | accepted | complete |
| ADR-039 | Realtime Client Strategy MQTT with Poll Fallback | accepted | complete |
| ADR-040 | File Storage MinIO Strategy | accepted | complete |
| ADR-041 | PostgreSQL Architecture | accepted | complete |
| ADR-042 | Drizzle ORM Exclusive Strategy | accepted | complete |
| ADR-043 | Database Modeling Standards | accepted | complete |
| ADR-044 | Indexing Standards | accepted | complete |
| ADR-045 | Query Design Standards | accepted | complete |
| ADR-046 | Migration Strategy Drizzle Kit | accepted | complete |
| ADR-047 | Data Integrity Soft Delete and Audit Fields | accepted | complete |
| ADR-048 | Multi-Tenant Data Isolation | accepted | complete |
| ADR-049 | Inventory Synchronization Strategy | accepted | complete |
| ADR-050 | Search and Barcode Scanning Strategy | accepted | complete |
| ADR-051 | Redis Architecture | accepted | complete |
| ADR-052 | Cache-Aside Read Strategy | accepted | complete |
| ADR-053 | Cache Key and TTL Standards | accepted | complete |
| ADR-054 | Cache Invalidation via Domain Events | accepted | complete |
| ADR-055 | Rate Limiting Strategy | accepted | complete |
| ADR-056 | MongoDB Analytics and Telemetry Plane | accepted | complete |
| ADR-057 | Event Warehouse Architecture | accepted | complete |
| ADR-058 | Audit Logging Architecture | accepted | complete |
| ADR-059 | Product Analytics Architecture | accepted | complete |
| ADR-060 | User Behavior and Clickstream Tracking | accepted | complete |
| ADR-061 | Session Analytics | accepted | complete |
| ADR-062 | Management Dashboard Analytics | accepted | complete |
| ADR-063 | Merchant OLTP Dashboard Analytics | accepted | complete |
| ADR-064 | Data Retention Strategy | accepted | complete |
| ADR-065 | Analytics Ingest Failure Isolation | accepted | complete |
| ADR-066 | Docker and Compose Local Parity | accepted | complete |
| ADR-067 | Containerization Standards | accepted | complete |
| ADR-068 | Environment and Secret Management | accepted | complete |
| ADR-069 | CI/CD Strategy (CI quality gates) | accepted | complete |
| ADR-076 | Security Architecture | accepted | complete |
| ADR-077 | API Protection and Data Protection | accepted | complete |
| ADR-078 | Testing Strategy | accepted | complete |
| ADR-081 | QR Acquisition Architecture Decision | accepted | complete |
| ADR-082 | Pickup-Only Fulfillment MVP Decision | accepted | complete |
| ADR-085 | ADR and ARD Governance Completion Rules | accepted | complete |
| ADR-086 | Storefront Architecture | accepted | complete |
| ADR-087 | Customer Dashboard Architecture | accepted | complete |
| ADR-088 | Merchant Dashboard Architecture | accepted | complete |
| ADR-089 | Admin Dashboard Architecture | accepted | complete |
| ADR-090 | Notification Architecture | accepted | complete |
| ADR-091 | MVP Product Policy Resolutions (PRD §19) | accepted | complete |

## future/ — Not implemented (10)

| ID | Title | Decision | ADR impl |
| --- | --- | --- | --- |
| ADR-070 | Deployment and Zero-Downtime Strategy | accepted | none |
| ADR-071 | Scalability Stateless Multi-Instance | accepted | none |
| ADR-072 | Data Plane Deployment Topology | accepted | none |
| ADR-073 | Backup and Disaster Recovery | accepted | none |
| ADR-074 | Observability Logging Metrics Tracing | accepted | none |
| ADR-075 | Monitoring and Alerting Strategy | accepted | none |
| ADR-079 | Unit Integration E2E Performance Testing | accepted | none |
| ADR-080 | Error Handling Strategy | accepted | none |
| ADR-083 | SMS Provider Selection Iran | proposed | none |
| ADR-084 | Payment PSP Selection | proposed | none |

## tasks/ — Product/runtime gaps from audit (30)

Still required for **MVP delivery** (persistence, HTTP, Auth.js App Router wire, live SDKs, e2e). See files under [`tasks/`](./tasks/) and Critical path in `AUDIT_REPORT.md`.

| ID range | Focus |
| --- | --- |
| ADR-092…094 | Migrations, Drizzle repos, HTTP `/api/v1` |
| ADR-095…106 | Auth, POS, catalog, CRM, loyalty, storefront, payments, portals, dashboards |
| ADR-107…119 | Notifications, Redis, outbox/EMQX, Mongo, MinIO, ready, RBAC, UI lib, SMS, obs, e2e, deploy, security |
| ADR-120…121 | STATUS honesty / onboarding |

---

## Notes

- Empty module shells (`src/modules/{audit,platform,realtime}`) do not reopen ADRs already covered by sibling contract packages.
- Do **not** equate ADR `complete` with ARD `completed` or production readiness.
