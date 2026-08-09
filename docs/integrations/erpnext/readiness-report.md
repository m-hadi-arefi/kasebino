# ERPNext Integration Readiness Report

Date: 2026-08-09 (re-evaluated)  
Scope: Real ERPNext financial-brain integration — not docs-only prep.

## Honest score

**ERPNext Integration Readiness: 62/100**

| Band | Meaning |
| --- | --- |
| 0–40 | Docs/ADRs only |
| 41–70 | Seam + adapter code + local Docker; staging soak incomplete |
| 71–90 | Dual-run posting invoices reliably; recon metrics |
| 91–100 | Production multi-tenant ops |

Previous **86/100** over-claimed prep ADRs as “implemented integration.”

## What exists now

| Piece | Status |
| --- | --- |
| Role/boundary/mapping/sync/UI ADRs (135–139) | Accepted in `adrs/tasks/` |
| Runtime adapter ADR-140 | Accepted; code landed |
| `AccountingProvider` + outbox consumer | Yes |
| `ErpNextAccountingProvider` (Frappe REST) | Yes (mocked HTTP tests) |
| `docker-compose.erpnext.yml` | Yes |
| Bootstrap script | Yes |
| POS membership → outbox | Yes (this pass) |
| OrderPaid lines | Yes (this pass) |
| Live Company/tax/dual-run soak | Pending local Setup Wizard + credentials |
| E→M Purchase Receipt | Not started |
| Reconciliation worker | Not started |

## ADR audit

| ADR | Reality |
| --- | --- |
| 126–134 | Architecture prep / contracts — **not** “ERPNext connected” |
| 135–139 | Correct product architecture (financial brain vs retail OS) |
| 140 | Runtime adapter + Docker sidecar |

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Fresh ERPNext needs Setup Wizard before API books work | High | Documented bootstrap; exit code 2 if no Company |
| POS `is_pos` + Mode of Payment names may need Desk seed | Medium | Bootstrap Cash customer; configure modes |
| Catalog enqueue not always same-TX as product write | Medium | Known; CompleteSale path is TX-safe |
| Double stock if someone also posts Stock Entry on sales | High | ADR-137: sales via Invoice Update Stock only |

## Security

| Check | Result |
| --- | --- |
| Secrets in repo | No (`.env.example` placeholders) |
| Browser credentials | Forbidden |
| DocTypes in retail domains | Forbidden (projectors under `providers/erpnext` only) |

## Next steps

1. Finish local Setup Wizard + `npm run erpnext:bootstrap`
2. Dual-run: CompleteSale → assert Sales Invoice in Desk
3. Seed Mode of Payment / accounts for Iranian IRR company
4. Reconciliation job
5. E→M purchase receipt → ops stock
