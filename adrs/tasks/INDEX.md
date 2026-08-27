# ADR tasks index

Last updated: 2026-08-09

| ID | Title | Priority | Complexity | Blocked by | Status |
| --- | --- | --- | --- | --- | --- |
| ADR-115 | Production SMS provider adapter | Critical | M | ADR-083 Accept (human) | Proposed |
| ADR-116 | Observability / metrics / alerts | High | L | — | Proposed |
| ADR-117 | E2E Playwright + perf gates | High | M | Prefer 142 for stock truth | Proposed |
| ADR-118 | Deploy, backup, DR | High | L | Prefer 116 signals | Proposed |
| ADR-135 | ERPNext role | — | S | Verify → done | Accepted/contract |
| ADR-136 | ERPNext boundary | — | S | Verify → done | Accepted/contract |
| ADR-137 | ERPNext data mapping | — | S | Verify → done | Accepted/contract |
| ADR-138 | ERPNext sync architecture | — | S | Verify → done | Accepted/contract |
| ADR-139 | ERPNext UI strategy | — | S | Verify → done | Accepted/contract |
| ADR-140 | ERPNext runtime adapter | High | M | Soak via 146 | in_progress |
| ADR-141 | ERPNext capability surfaces | High | M | Honesty via 146 | in_progress |
| **ADR-142** | Ordering ↔ inventory wiring | **Critical** | M | — | Proposed |
| **ADR-143** | Iranian PSP production gateway | **Critical** | L | ADR-084 Accept | Proposed |
| **ADR-144** | Staff invite + role assignment | High | L | — | Proposed |
| **ADR-145** | Loyalty online earn + coupons | High | S–M | Prefer 142 | Proposed |
| **ADR-146** | ERPNext dual-run + finance honesty | **Critical** | M | Worker + ERP site | Complete |
| **ADR-147** | Product images | Medium | M | MinIO (done) | Proposed |
| **ADR-148** | Stock movement history UI | Medium | S | — | Proposed |
| **ADR-149** | Store hours HTTP/UI | Medium | S | — | Proposed |
| **ADR-150** | Migration hygiene + integrity | Medium | M | Coordinate 145 | Proposed |
| **ADR-151** | Fail-closed guards + worker MinIO parity | High | S | After 142 | Complete |
| **ADR-152** | Catalog cost + tax boundary | Medium | S | — | Proposed |
| **ADR-154** | Admin Security Dashboard Monitoring | High | M | — | Complete |
| **ADR-155** | Offline POS Queue Runtime | **Critical** | M | — | Complete |

## Human-gated vendors (`adrs/future/`)

| ID | Decision needed |
| --- | --- |
| ADR-083 | SMS vendor |
| ADR-084 | Payment PSP |
| ADR-070…075, 079 | Architecture contracts for deploy/obs/testing (runtime via 116–118) |
