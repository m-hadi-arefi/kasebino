# Next.js

## Purpose

App Router UI + Route Handlers + Server Actions for modular monolith.

## Why chosen

Single TypeScript stack for UI and API; RSC for dashboards; great DX.

## Best practices

- App Router only
- Server Components default; 'use client' minimally
- Route handlers for public JSON; Server Actions for authed UI mutations
- Strict TypeScript
- Data fetching (ADR-026): RSC for dashboards/marketing; TanStack Query for interactive POS/CRM; avoid RSC waterfalls on POS

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `app/` for App Router routes (ADR-017 groups)
  - `app/(marketing)/` — public marketing (`/`)
  - `app/(merchant)/` — merchant surfaces (`/dashboard`, `/pos`, …)
  - `app/(storefront)/s/[storeSlug]/` — per-store storefront (ADR-091)
  - `app/(admin)/admin/` — platform admin
  - `app/api/v1/` — versioned Route Handlers
- No delivery/courier/shipping route segments (pickup-only MVP)
- `src/modules/*/api` for handlers wiring
- `src/modules/*/ui` for feature UI
- `src/components/{ui,composites,domain}` for layered UI (ADR-018)
- `src/data-fetching` for TanStack Query contract + provider stub (ADR-026)
- `middleware.ts` for coarse audience gates (+ later auth gatekeepers)
- Contracts: `src/app-router-structure/`, `src/frontend-components/`

## Anti-patterns

- God components with DB access
- Business rules in page.tsx
- Disabling RSC without reason

## Performance recommendations

- Stream RSC carefully on POS (prefer light client POS)
- Cache storefront with revalidate tags aligned to Redis strategy

## Security recommendations

- Never trust client merchantId
- Validate all inputs with Zod
- Secure cookies in prod

## Example architecture usage

POS at app/(merchant)/pos; APIs under app/api/v1; modules imported by use-case.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
