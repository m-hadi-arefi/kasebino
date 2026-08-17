# Project Folder Structure Standard & Organization Guide

This document is the canonical source of truth for the codebase layout, directory responsibilities, naming conventions, and file placement rules for MerchantOS (Kasbino).

---

## 1. Project Root Layout

```text
kasbino/
├── app/                              # Next.js App Router (pages, layouts, route handlers)
│   ├── (admin)/                      # Admin web application surface
│   ├── (auth)/                       # Authentication & onboarding flows
│   ├── (customer)/                   # Customer portal & store memberships
│   ├── (merchant)/                   # Merchant management dashboard & staff POS
│   ├── (storefront)/                 # Public merchant storefront & customer PWA
│   └── api/                          # REST API route handlers (/api/v1/*)
│
├── src/                              # Core application runtime implementation
│   ├── modules/                      # Domain bounded contexts (DDD)
│   ├── infrastructure/               # Technical infrastructure & external integrations
│   ├── events/                       # Cross-cutting events & outbox contracts
│   ├── workers/                      # Standalone background runtimes
│   ├── shared/                       # Shared kernel, VOs, state, errors, contracts
│   ├── components/                   # Reusable React UI components
│   ├── hooks/                        # Reusable React hooks
│   ├── lib/                          # Low-level utilities
│   ├── types/                        # Ambient/global TypeScript declarations
│   ├── auth.ts                       # NextAuth Node runtime export
│   └── auth.config.ts                # NextAuth edge-compatible configuration
│
├── adrs/                             # Architecture Decision Records
│   ├── done/                         # Accepted & implemented architecture decisions
│   ├── tasks/                        # Active engineering roadmap tasks
│   └── future/                       # Proposed / deferred decisions
│
├── docs/                             # Engineering documentation
│   ├── architecture/                 # System design and technical standards
│   ├── ards/                         # Architectural Requirement Documents
│   ├── checklists/                   # Mandatory quality and UX checklists
│   ├── integrations/                 # External system integration guides (ERPNext, etc.)
│   ├── product/                      # Product specifications & decompositions
│   ├── rules/                        # Binding engineering laws (e.g. Iranian First)
│   └── uiux/                         # Design system, tokens, and UI guidelines
│
├── scripts/                          # Maintenance, bootstrap, and tooling scripts
└── e2e/                              # Playwright end-to-end integration tests
```

---

## 2. Directory Responsibilities

| Directory | Purpose | What Belongs Here | What DOES NOT Belong Here |
| --- | --- | --- | --- |
| `app/` | Next.js App Router | Pages, layouts, React Server Components, server actions, route handlers | Business domain logic, raw DB queries, direct ORM schemas |
| `src/modules/` | Business Domain Contexts | Domain entities, use cases, ports, domain repository interfaces | Raw SQL migrations, Next.js page components |
| `src/infrastructure/` | Technical Infrastructure | Drizzle client, Redis clients, EMQX clients, MinIO, Mongo plane, security middleware, Auth.js runtime | Pure business calculations, UI views |
| `src/events/` | Event Subsystem | Domain event catalog, naming conventions, warehouse mappings, outbox models | Direct UI components, raw REST endpoints |
| `src/workers/` | Background Workers | Outbox processor, background queues, cron workers | App router routes, React components |
| `src/shared/` | Shared Kernel | Money VO, Iranian Phone VO, Quantity VO, errors, state management, shared contracts | Module-specific private logic |
| `src/components/` | UI Components | shadcn primitives, layout composites, design system UI | Database models, HTTP route handlers |
| `src/hooks/` | React Hooks | Reusable client-side lifecycle and state hooks | Node server APIs, DB clients |
| `src/lib/` | Utilities | Pure helper functions (e.g. `cn`, formatters) | Domain models, API routes |
| `adrs/` | Architecture Decisions | ADR markdown specifications | Runnable TypeScript code |
| `docs/` | System Documentation | Guides, diagrams, roadmaps, policies | Application code |

---

## 3. Module Organization (`src/modules/<domain>/`)

Where applicable, each business domain bounded context follows this internal Clean Architecture structure:

```text
src/modules/<domain>/
├── domain/                           # Entities, Value Objects, Domain Events, Repository Interfaces
│   ├── <entity>.ts
│   ├── events.ts
│   ├── repositories.ts
│   └── contracts/                    # ADR decision contracts and baseline assertions
├── application/                      # Use Cases, Command Handlers, Query Handlers, DTOs
│   ├── use-cases.ts
│   └── errors.ts
├── infrastructure/                   # Concrete Repositories (Drizzle, In-Memory), External Adapters
│   ├── persistence/
│   │   ├── drizzle-<entity>-repository.ts
│   │   └── in-memory-<entity>-repository.ts
│   └── adapters/
├── ui/                               # Module-specific UI helpers, state, copy, formatting
│   ├── api.ts
│   ├── copy.ts
│   ├── format.ts
│   └── state/
└── index.ts                          # Public API export barrel for the module
```

> **Note**: Do not create empty layers merely for aesthetic reasons. Only create subdirectories when the module actually implements that layer.

---

## 4. Infrastructure Organization (`src/infrastructure/<tech>/`)

Technical implementations live under `src/infrastructure/`:

```text
src/infrastructure/
├── database/                         # PostgreSQL + Drizzle ORM
│   ├── schema/                       # Drizzle table definitions
│   ├── migrations/                   # Versioned SQL migrations
│   ├── contracts/                    # DB modeling, indexing, and migration contracts
│   └── client.ts                     # Database connection pool
├── redis/                            # Redis caching and key standards
│   ├── cache-aside/                  # Cache-aside port and in-memory store
│   ├── cache-invalidation/           # Invalidation contracts
│   └── cache-keys/                   # Key formatting standards
├── emqx/                             # EMQX Realtime & MQTT messaging
│   ├── realtime-client/              # Browser MQTT client with fallback
│   └── contracts/                    # Realtime architecture contracts
├── minio/                            # MinIO S3-compatible object storage
├── mongodb/                          # MongoDB analytics & telemetry warehouse
├── auth/                             # NextAuth runtime, session guard, OTP runtime
├── security/                         # RBAC, rate-limiting, API protection, headers
├── http/                             # HTTP route handler wrappers, envelopes, auth guards
├── persistence/                      # Repository factory (production Drizzle / test in-memory)
└── composition/                      # AppContext / ApiContext dependency injection root
```

---

## 5. Forbidden Patterns & Anti-Patterns

### ❌ Anti-Pattern 1: Top-Level Folders for ADRs
Never create a folder under `src/` named after an ADR or general architecture concept:
- ❌ `src/backend-layering/`
- ❌ `src/database-modeling/`
- ❌ `src/redis-architecture/`
- ❌ `src/security-architecture/`
- ❌ `src/testing-strategy/`
- ❌ `src/shadcn-strategy/`
- ❌ `src/nextjs-architecture/`
- ❌ `src/modular-monolith/`

**Correct Placement:**
- Place documentation in `adrs/done/ADR-xxx.md` or `docs/architecture/`.
- Place contracts and runtime helpers in `src/shared/contracts/`, `src/infrastructure/<tech>/contracts/`, or `src/modules/<domain>/domain/contracts/`.

### ❌ Anti-Pattern 2: Split Domain Concepts
Never create fragmented top-level folders for parts of the same domain:
- ❌ `src/pos-offline/`, `src/pos-sales/`, `src/staff-pwa/`
- ✅ Consolidate inside `src/modules/pos/` (e.g. `src/modules/pos/offline/`, `src/modules/pos/domain/sales/`, `src/modules/pos/ui/staff-pwa/`).

### ❌ Anti-Pattern 3: Leakage of Server Code to Client Bundles
Never import server-only assertions or Node-only APIs (`node:fs`, `node:path`) into barrel files that are consumed by client components (`"use client"`).

---

## 6. Naming Conventions

1. **Directories**: kebab-case (`src/modules/customer-identity/`, `src/infrastructure/database/`).
2. **TypeScript Files**: kebab-case (`use-pos-cart.ts`, `drizzle-store-repository.ts`).
3. **React Components**: kebab-case for filenames (`role-builder-dialog.tsx`), PascalCase for exported components (`RoleBuilderDialog`).
4. **Unit/Contract Tests**: Adjacent to source file with `.test.ts` or `.test.tsx` extension (`store-repository.test.ts`).
5. **Integration Tests**: Suffix with `.integration.test.ts` (`persian-roundtrip.integration.test.ts`).

---

## 7. Rules for AI Agents

Before creating any file or directory, every AI agent MUST:

1. **Search existing structure first**: Look inside `src/modules/`, `src/infrastructure/`, `src/shared/`, and `app/`.
2. **Extend existing domain modules**: If a feature is part of Catalog, it belongs in `src/modules/catalog/`.
3. **Extend existing infrastructure**: If adding Redis cache logic, add to `src/infrastructure/redis/`.
4. **Never create top-level `src/` directories**: Top-level `src/` is strictly locked to `modules`, `infrastructure`, `events`, `workers`, `shared`, `components`, `hooks`, `lib`, `types`.
5. **Keep documentation outside `src/`**: Documentation must go to `docs/` or `adrs/`.
6. **Pass all validation checks**: `npm run validate` and `npm run build` must succeed after any change.
