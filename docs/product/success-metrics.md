# Success Metrics

## North Star

**Monthly Returning Customers**

Customers who make more than one purchase within a rolling 30-day window.

Must be visible on the Retention dashboard (AN-04) and computable from completed sales.

## Merchant metrics

| Metric | Target |
| --- | --- |
| Merchant activation rate | 70% |
| 30-day merchant retention | 70% |
| 90-day merchant retention | 50% |

**Activation definition (engineering default):** merchant completes first `SaleCompleted` with customer phone after registration. Adjust only via decision record.

## Customer metrics

| Metric | Target |
| --- | --- |
| Customer capture rate (sales with phone) | 80% |
| Repeat purchase rate | 25% |
| Average customer LTV | Track per merchant (no fixed MVP target) |

## Platform metrics (continuous)

- Daily Active Merchants (DAM)
- Monthly Active Merchants (MAM)
- GMV
- Revenue
- ARPU
- LTV
- CAC

## Instrumentation requirements

- Prefer domain events as metric sources (`SaleCompleted`, `CustomerReturned`, `MerchantActivated`, …).
- Dashboard aggregations are cache-backed (analytics TTL 60s).
- Never invent metrics in UI without event/data definition in `docs/architecture/event-catalog.md` or analytics ARD.
