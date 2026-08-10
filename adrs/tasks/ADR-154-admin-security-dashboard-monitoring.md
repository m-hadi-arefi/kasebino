# ADR-154 — Admin Security Dashboard and Fraud Monitoring Hooks

| Field | Value |
| --- | --- |
| ID | ADR-154 |
| Status | `Proposed` |
| Date | 2026-08-10 |
| Folder | `adrs/tasks/` |

## Status

`Proposed` — Implementation-ready runtime gap ADR.

## Title

Admin Security Dashboard and Fraud Monitoring Hooks

## Context

The PRD calls for "Fraud/abuse monitoring hooks" (ADM-02) and "Security monitoring signals and admin alert hooks" (PA-08). Currently, the infrastructure layer provides a `createNoopSecurityMonitoringPort` stub, and the route `app/(admin)/admin/security` is a placeholder.

## Problem Statement

Without a functional security monitoring dashboard and active fraud hooks, the platform is blind to abuse (e.g., OTP spam, rapid fake orders, unauthorized access attempts) and admins lack the tools to investigate and mitigate such attacks.

## Goals

- Implement active security monitoring hooks to replace the noop stub.
- Develop the Admin Security Dashboard UI to display fraud/abuse signals.
- Wire critical domain events (e.g., OTP failures, suspicious logins) to the security port.

## Non Goals

- Automated suspension of merchants (human-in-the-loop required for MVP).
- Complex machine learning fraud detection models.

## Functional Requirements

- FR-1: Replace `createNoopSecurityMonitoringPort` with a MongoDB or Redis-backed signal sink.
- FR-2: Admin Security Dashboard displays a feed of security alerts (high OTP failure rates, suspicious logins).
- FR-3: Admins can view aggregated security metrics across the platform.

## Technical Design

1. Extend the `admin` bounded context to query security signals from MongoDB.
2. Implement the `app/(admin)/admin/security` page with charts and alert tables.
3. Ensure the security port publishes events to EMQX for real-time admin alerts (ADM-03).

## Dependencies

- ADR-110 (MongoDB Analytics Runtime)
- ADR-075 (Monitoring and Alerting Strategy)

## Iranian User Experience Requirements

- Dashboard must be fully localized in Persian with Jalali timestamps for security events.

## Completion Criteria

- [ ] Security monitoring port implemented and wired to authentication and ordering modules.
- [ ] Admin Security Dashboard UI completed.
- [ ] Real-time alerts visible to admins.
