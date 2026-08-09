# `adrs/tasks/` — Product / runtime implementation queue

Source of truth for **what to build next** via `ard-to-code`.

Architecture-contract ADRs live in [`../done/`](../done/). Vendor-selection Proposed ADRs remain in [`../future/`](../future/) until humans Accept.

**Runtime audit (2026-08-09):** [`../../docs/audit/`](../../docs/audit/)  
**Execution order:** [`../../docs/architecture/adr-execution-order.md`](../../docs/architecture/adr-execution-order.md)  
**Index:** [`INDEX.md`](./INDEX.md)

## Do not recreate

These are **already runtime-landed** (do not open duplicate “database persistence / api surface / auth / POS shell” ADRs numbered 122–134):

| Capability | Evidence ADR (done) |
| --- | --- |
| Drizzle migrations + repos | ADR-092, ADR-093 |
| Composition root | ADR-123 |
| HTTP `/api/v1` | ADR-094 |
| NextAuth OTP | ADR-095, ADR-103 |
| RBAC route enforcement | ADR-113 |
| POS + offline | ADR-096, ADR-105 |
| Catalog/inventory UI/API | ADR-097 |
| CRM / loyalty / storefront / orders / payments sandbox | ADR-098…102 |
| Redis / MinIO / Mongo / outbox+EMQX | ADR-108…111, ADR-109 |

## Critical path (start here)

1. **ADR-142** Ordering ↔ inventory wiring  
2. **ADR-146** ERPNext soak + honest finance  
3. **ADR-151** Fail-closed + worker parity (after 142)  
4. **ADR-144** Staff invite  
5. **ADR-115** SMS (needs ADR-083 Accept)  
6. **ADR-143** PSP (needs ADR-084 Accept)  
7. **ADR-145** Loyalty online earn  
8. **ADR-117** Playwright money journeys + CI Postgres  
9. Medium UX: **147–149**, **152**  
10. **ADR-150** DB hygiene  
11. **ADR-116** Observability → **ADR-118** Deploy/DR  

## ERPNext 135–141 note

Code for adapter/UI largely exists; treat these as **verify → move to `done/`** after soak evidence (ADR-146), not as greenfield rewrites.
