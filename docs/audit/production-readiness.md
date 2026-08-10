# Production readiness (MVP-calibrated)

**Audit date:** 2026-08-09  
**Calibration:** Iranian local-retail MVP (pickup-only, POS, CRM, storefront, multi-store). Not enterprise ERP completeness.

Older `AUDIT_REPORT.md` (2026-08-03) scored ~6–11% product — **that snapshot is obsolete**. Runtime APIs, Drizzle repos, auth, POS/offline, CRM, loyalty, storefront, and ERP adapter have since landed.

---

## Scores (0–100)

| Area | Score | Rationale |
| --- | ---: | --- |
| **Backend** | **76** | Modular use-cases, composition root, ~90 `/api/v1` routes, outbox worker, idempotency on money aggregates. Production guards reject inventory stubs and fake finance (ADR-151). Drag: sandbox PSP. |
| **Frontend** | **71** | Real merchant + storefront + admin + finance Persian/RTL surfaces beyond shells. Drag: hours/branding gaps, no staff UI, finance numbers not trustworthy in fake/noop modes. |
| **Database** | **70** | Migrations + indexed OLTP model + soft-delete patterns. Drag: no FKs/RLS, orphan coupons, hand migration meta drift (`0003`/`0005`). |
| **Security** | **60** | OTP + NextAuth + RBAC gates + secret guards + tenant asserts. Drag: no employee lifecycle, no RLS, noop security monitoring, sandbox payment escape hatch, weak local Compose secrets by design. |
| **Operations** | **45** | Docker Compose for full data plane + optional worker + health/ready. Worker env includes MinIO parity (ADR-151). Drag: no CD/DR/APM, ERPNext sidecar operationally manual. |
| **ERPNext readiness** | **62** | Matches `docs/integrations/erpnext/readiness-report.md`: adapter + Docker + sync records + finance ACL UI; dual-run soak / recon / AP not done. |

### Composite MVP readiness

**~63 / 100** for “run a pilot store on staging with sandbox pay + optional ERP.”  
**~37 / 100** for “hard production Iran with real PSP + trusted books + multi-staff” — blocked by Critical items below.

---

## Gate checklist

| Gate | Pass? | Evidence / blocker |
| --- | :---: | --- |
| Durable OLTP | Yes | Drizzle + migrate |
| Auth sessions | Yes | NextAuth OTP |
| POS sale durable | Yes | CompleteSale + UoW |
| Offline POS | Yes | IDB + sync API |
| Online order + board | Partial | Works; **stock not moved** |
| Real money online | No | Sandbox only |
| Prod SMS | No | Future ADR-115 |
| ERP books dual-run | No | Needs env + Wizard + soak |
| Observability | No | Future ADRs |
| Staff RBAC ops | No | Matrix without HR flow |

---

## Operational money vs accounting

| Concern | SoT today | Production note |
| --- | --- | --- |
| POS cash/card tender | `sales.tender_type` | Label only for card |
| Online pay | `payments` + sandbox gateway | Do not enable sandbox confirms in prod |
| Books / AR / tax | ERPNext (when provider=erpnext) | Default **noop**; finance UI may show Fake zeros |
| Inventory economic valuation | Not in MOS | Deferred to ERP phases |

Do not treat `/finance` dashboard as books of record until live reader + Company setup proven.
