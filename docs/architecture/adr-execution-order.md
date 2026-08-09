# ADR execution order (runtime completion)

**Audit SoT:** [`docs/audit/`](../audit/) (2026-08-09)  
**Queue:** [`adrs/tasks/`](../../adrs/tasks/)

> Do **not** restart foundation ADRs for persistence/API/auth — those runtime paths already exist under `adrs/done/` (092–113, 123, etc.). This graph closes **remaining** production gaps.

```
                    ┌─────────────────────┐
                    │  Human Accept       │
                    │  ADR-083 SMS        │
                    │  ADR-084 PSP        │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   ADR-115 SMS           ADR-143 PSP           (local sandbox OK)
         │                     │
         │                     ▼
         │              Online paid money
         │                     │
┌────────┴────────┐            │
│ ADR-142         │◄───────────┘ preferred before trusting stock
│ Order→Inventory │
└────────┬────────┘
         │
         ├──────────────► ADR-145 Loyalty online earn
         │
         ▼
   ADR-151 Fail-closed + worker MinIO parity
         │
         ▼
   ADR-146 ERPNext soak + honest finance KPIs
         │         ▲
         │         │ verify/close
         │    ADR-135…141 (move to done when evidenced)
         ▼
   ADR-144 Staff invite / roles ──► cashier vs manager ops
         │
         ▼
   ADR-117 E2E money journeys + CI Postgres
         │
    ┌────┴────┬─────────┬──────────┐
    ▼         ▼         ▼          ▼
 ADR-147   ADR-148   ADR-149    ADR-152
 images    movements hours      cost/tax UX
    │         │         │          │
    └─────────┴────┬────┴──────────┘
                   ▼
              ADR-150 DB hygiene
                   ▼
              ADR-116 Observability
                   ▼
              ADR-118 Deploy / backup / DR
                   ▼
           Production-ready retail pilot
```

## Waves

| Wave | ADRs | Outcome |
| --- | --- | --- |
| W0 Human | 083, 084 | Unblocks SMS + real PSP |
| W1 Data integrity | **142**, 151 | Online orders move stock; prod won’t boot on stubs |
| W2 Finance truth | **146**, close 140/141 | Desk invoices + honest UI |
| W3 People | **144**, 115 | Multi-staff + real OTP SMS |
| W4 Money | **143** | Real online payments |
| W5 Retention polish | 145, 147–149, 152 | Earn/images/hours/cost |
| W6 Quality & ops | 117, 150, 116, 118 | Tests, schema, observe, ship |

## Critical path

`142 → 151 → 146 → 144 → 115 → 143 → 117 → 118`

Parallelizable after 142: `145`, `147–149`, `152`, `150`.

## Blocked tasks

| ADR | Blocker |
| --- | --- |
| 115 | ADR-083 human Accept |
| 143 | ADR-084 human Accept |
| 151 | Should land after 142 (else production cannot boot) |
| 146 | Running ERPNext site + worker |
| 140/141 close | Evidence from 146 soak |

## Complexity legend

S ≤ 1–2 days · M ≈ 3–7 days · L ≈ 1–3 weeks (one engineer familiar with repo)
