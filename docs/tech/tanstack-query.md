# TanStack Query

## Purpose

Client **server-state** cache for merchant UI per **ADR-025** ownership. Install + wiring: **ADR-026** (`src/data-fetching`).

## Why chosen

Handles retry/stale for dashboards & CRM lists. Keeps server truth out of Zustand.

## Best practices

- Query keys include merchant scope + entity (`buildScopedQueryKey`)
- Invalidate on mutation + realtime events
- No duplicated global fetch soup
- Clear query cache on logout (`clearQueryCacheOnLogout`, with POS cart clear)
- Prefer RSC for dashboards/marketing; TanStack Query for interactive POS/CRM
- Never ad-hoc `fetch` inside `useEffect`

## Project conventions

- Strategy contract: `src/data-fetching` (`DATA_FETCHING_STRATEGY`)
- Ownership declared in `src/state-management` (`SERVER_STATE_OWNERSHIP`)
- `createMerchantQueryClient` + `MerchantQueryProvider` stub
- Per-surface `staleTime` via `STALE_TIMES_MS` (POS shorter)
- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters/hooks over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `src/data-fetching` (ADR-026)
- `src/modules/*/ui/queries` for feature hooks

## Anti-patterns

- Caching PII beyond need on shared devices without lock
- Putting server lists into Zustand instead of Query
- Tokens in query keys
- RSC waterfalls on POS
- Ad-hoc fetch in `useEffect`

## Performance recommendations

- staleTime tuned per view (POS product shorter — see `STALE_TIMES_MS`)

## Security recommendations

- Do not put tokens in query keys
- Auth credentials on authenticated client fetches

## Iranian First

- Cached display payloads must preserve Unicode Persian
- Suspense / error placeholders Persian + RTL (no English flash)

## Example architecture usage

```ts
import {
  createMerchantQueryClient,
  MerchantQueryProvider,
  buildScopedQueryKey,
  staleTimeForSurface,
} from "../../src/shared/contracts/data-fetching/index.js";

const client = createMerchantQueryClient();
// Mount MerchantQueryProvider({ client, children }) in a client shell.
```

Realtime SaleCompleted → invalidate analytics queries.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.  
Related ADRs: ADR-025 (ownership), ADR-026 (fetching strategy).
