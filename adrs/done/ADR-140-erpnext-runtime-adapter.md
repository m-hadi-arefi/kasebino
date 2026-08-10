# ADR-140 - ERPNext Runtime Adapter + Local Docker

| Field | Value |
| --- | --- |
| ID | ADR-140 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext goal re-evaluation (user: full connectable adapter + Docker) |
| Folder | `adrs/tasks/` |
| Depends on | ADR-135…139, ADR-126 |

## Status

`Accepted` — Runtime adapter + optional local ERPNext Compose are in scope.

## Title

ERPNext Runtime Adapter — Frappe REST Provider and Docker Parity

## Decision

1. Implement `ErpNextAccountingProvider` under `src/modules/accounting/infrastructure/providers/erpnext/`.
2. Authenticate with Frappe token header: `Authorization: token api_key:api_secret`.
3. Use REST: `POST/PUT/GET /api/resource/:DocType` and submit via `frappe.client.submit` / docstatus where required.
4. Select via `MOS_ACCOUNTING_PROVIDER=erpnext` (server/worker only).
5. Ship `docker-compose.erpnext.yml` (frappe/erpnext pwd-style stack) on host port `8080` for local books.
6. Ship bootstrap script to wait for site, ensure Company/Warehouse defaults, mint API keys, print env lines.
7. Unit tests mock HTTP — no live ERPNext required in CI.
8. Default provider remains `noop` so CI without ERPNext stays green.

### Env (server/worker)

| Variable | Purpose |
| --- | --- |
| `MOS_ACCOUNTING_PROVIDER` | `noop` \| `fake` \| `erpnext` |
| `MOS_ERPNEXT_URL` | Base URL e.g. `http://localhost:8080` |
| `MOS_ERPNEXT_API_KEY` / `MOS_ERPNEXT_API_SECRET` | Token pair |
| `MOS_ERPNEXT_COMPANY` | Company name |
| `MOS_ERPNEXT_WAREHOUSE` | Default warehouse |
| `MOS_ERPNEXT_COST_CENTER` | Optional |
| `MOS_ERPNEXT_PRICE_LIST` | Optional selling price list |
| `MOS_ERPNEXT_DEFAULT_CUSTOMER` | Fallback cash customer |
| `MOS_ERPNEXT_CURRENCY` | Default `IRR` |
| `MOS_ERPNEXT_TIMEOUT_MS` | HTTP timeout |

### Local ops

```bash
docker compose -f docker-compose.erpnext.yml up -d
npm run erpnext:bootstrap
# set MOS_ACCOUNTING_PROVIDER=erpnext + printed secrets in .env
npm run worker:outbox
```

## Non-Goals

- Production multi-tenant SaaS ERPNext fleet
- Custom Frappe apps in this ADR
- Replacing MOS UI with Desk

## Iranian User Experience Requirements

- Local accountants open Desk at `:8080` (finance only).
- Cashiers never leave MOS POS.

## Completion Criteria

- [ ] Provider implements syncProduct/Customer, recordSale/Payment, recordInventoryAdjustment
- [ ] Compose file + bootstrap docs
- [ ] Mocked HTTP tests pass
- [ ] Worker/app composition can select erpnext
- [ ] Readiness report score reflects adapter existence honestly

## Related ADRs

- ADR-066 (MOS compose unchanged; ERPNext is sidecar compose), ADR-136…138
