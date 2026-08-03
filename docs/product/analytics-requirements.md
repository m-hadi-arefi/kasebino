# Analytics & Telemetry Product Requirements

Additive requirements beyond PRD merchant dashboards (AN-*). Trace into ARD-021+.

## Platform analytics — `PA`

| ID | Requirement | Priority |
| --- | --- | --- |
| PA-01 | System supports product analytics event ingest to MongoDB | P0 |
| PA-02 | Domain events are mirrored to an event warehouse | P0 |
| PA-03 | Sensitive actions produce audit records queryable by admin | P0 |
| PA-04 | Clickstream + session tracking for merchant app and storefront | P0 |
| PA-05 | Feature usage analytics by stable feature keys | P1 |
| PA-06 | Conversion funnels: activation, POS capture, storefront | P0 |
| PA-07 | Management dashboards for platform admin | P1 |
| PA-08 | Security monitoring signals and admin alerts hooks | P1 |
| PA-09 | Analytics ingest failure must not block POS after OLTP commit | P0 |
| PA-10 | Retention policies enforced per data class | P0 |
| PA-11 | Tenant isolation on all merchant analytics queries | P0 |
| PA-12 | Observability correlates logs/traces/metrics with analytics `correlationId` | P0 |

## Notes

- Merchant-facing revenue/retention dashboards remain AN-01..04 / ARD-016 (PostgreSQL projections).  
- MongoDB enhances product learning and platform ops; it does not replace OLTP.  
