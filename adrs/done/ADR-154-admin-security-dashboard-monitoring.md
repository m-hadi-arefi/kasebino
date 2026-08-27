# ADR-154 — Admin Security Dashboard, Fraud Monitoring and Platform Observability

| Field  | Value         |
| ------ | ------------- |
| ID     | ADR-154       |
| Status | `Accepted` |
| Date   | 2026-08-10    |
| Folder | `adrs/done/` |

## Status

`Accepted` — Implementation-ready runtime security, fraud monitoring, and platform observability ADR.

## Title

Admin Security Dashboard, Fraud Monitoring and Platform Observability

## Context

The PRD calls for:

* Fraud/abuse monitoring hooks (`ADM-02`)
* Security monitoring signals and admin alert hooks (`PA-08`)
* Operational monitoring and observability

Currently, the infrastructure layer provides a `createNoopSecurityMonitoringPort` stub, while `app/(admin)/admin/security` is only a placeholder.

## Completion Criteria

* [x] `createNoopSecurityMonitoringPort` replaced with a real implementation.
* [x] Authentication security events wired to monitoring.
* [x] Ordering/business security events wired to monitoring.
* [x] Admin Security Dashboard completed.
* [x] Security metrics implemented.
* [x] Real-time security alerts implemented.
* [x] Persian UI and Jalali formatting implemented.
