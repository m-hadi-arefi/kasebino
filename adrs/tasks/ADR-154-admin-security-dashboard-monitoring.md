# ADR-154 — Admin Security Dashboard, Fraud Monitoring and Platform Observability

| Field  | Value         |
| ------ | ------------- |
| ID     | ADR-154       |
| Status | `Proposed`    |
| Date   | 2026-08-10    |
| Folder | `adrs/tasks/` |

## Status

`Proposed` — Implementation-ready runtime security, fraud monitoring, and platform observability ADR.

## Title

Admin Security Dashboard, Fraud Monitoring and Platform Observability

## Context

The PRD calls for:

* Fraud/abuse monitoring hooks (`ADM-02`)
* Security monitoring signals and admin alert hooks (`PA-08`)
* Operational monitoring and observability

Currently, the infrastructure layer provides a `createNoopSecurityMonitoringPort` stub, while `app/(admin)/admin/security` is only a placeholder.

The platform also contains multiple runtime components whose health and behavior must be observable:

* Kasebino application/API
* Authentication and authorization
* PostgreSQL / database
* Redis
* Background workers
* Queues
* External integrations
* ERPNext / Frappe
* ERPNext background workers and scheduler
* HTTP APIs
* Business-critical operations

Without a unified observability system, administrators and engineers cannot reliably answer:

* Is the platform healthy?
* Which service is failing?
* Why is an API request slow?
* Why did an ERPNext synchronization fail?
* Which tenant/store is affected?
* Is an authentication or OTP attack occurring?
* Are queues backing up?
* Is Redis or the database becoming a bottleneck?
* Which ERPNext operation caused a failed business operation?
* What happened immediately before an error?
* Which alerts require immediate attention?

The platform therefore requires a unified observability architecture covering both **security/fraud signals** and **technical/runtime telemetry**.

---

# Problem Statement

The current security monitoring implementation is incomplete and the platform lacks a unified production-grade observability layer.

Security events may occur without being visible to administrators, while technical failures may require manual investigation through disconnected logs.

This creates two major blind spots:

### Security blind spot

Examples:

* OTP abuse
* repeated authentication failures
* suspicious login patterns
* unauthorized access attempts
* abnormal order creation
* suspicious account behavior
* repeated failed operations

### Technical observability blind spot

Examples:

* slow API requests
* database bottlenecks
* Redis latency
* queue backlog
* worker failures
* ERPNext API failures
* ERPNext synchronization failures
* ERPNext latency
* infrastructure resource exhaustion

The system must provide a unified observability model that connects:

```text
Security Event
      +
Application Metric
      +
Distributed Trace
      +
Exception
      +
Infrastructure Health
      +
Business Operation
```

---

# Goals

## Security & Fraud

* Replace `createNoopSecurityMonitoringPort` with a real monitoring implementation.
* Capture security and fraud-related signals.
* Provide an Admin Security Dashboard.
* Provide aggregated security metrics.
* Provide real-time security alerts.
* Allow admins to investigate security events.
* Preserve human-in-the-loop decision making for security actions.

## Platform Observability

Implement production-grade observability using:

* OpenTelemetry
* OpenTelemetry Collector
* Jaeger
* Prometheus
* Grafana

The observability architecture must cover:

* Kasebino API
* application services
* workers
* queues
* PostgreSQL/database
* Redis
* external HTTP integrations
* ERPNext
* ERPNext integration operations
* important business operations

## Correlation

Security events, metrics, traces and errors must be correlated whenever technically possible.

An administrator investigating an event should be able to move from:

```text
Security Alert
    ↓
Trace
    ↓
Span
    ↓
Exception
    ↓
Related Operation
```

## Production Readiness

Observability must:

* have minimal application overhead
* fail safely
* never make business requests fail because monitoring is unavailable
* support persistence
* support retention policies
* support sampling
* protect secrets and sensitive data

---

# Non Goals

* Automated merchant suspension.
* Automated account banning without human approval.
* Machine-learning fraud detection.
* Replacing ERPNext's internal business functionality.
* Rewriting existing application architecture solely for observability.
* Using Prometheus as a high-cardinality event store.
* Storing sensitive credentials or personal data in telemetry.
* Building a complete SIEM system.

---

# Architecture

The platform will use OpenTelemetry as the standard telemetry layer.

```text
                         KASEBINO
                            │
                   OpenTelemetry SDK
                            │
                            ▼
                OpenTelemetry Collector
                    │               │
                 Traces           Metrics
                    │               │
                    ▼               ▼
                 Jaeger         Prometheus
                    │               │
                    └───────┬───────┘
                            ▼
                         Grafana
                            │
                 Dashboards + Alerts
```

ERPNext participates in the same observability architecture:

```text
Kasebino
   │
   │ HTTP + Trace Context
   ▼
ERPNext / Frappe
   │
   ├── HTTP Requests
   ├── Business Logic
   ├── MariaDB
   ├── Redis
   ├── Background Workers
   └── Scheduler
```

---

# Functional Requirements

## FR-1 — Security Monitoring Port

Replace:

```text
createNoopSecurityMonitoringPort
```

with a production-capable security monitoring implementation.

The implementation must support:

* security event publishing
* event persistence
* aggregation
* querying
* severity
* timestamps
* event type
* source
* relevant tenant/store context
* trace correlation where available

---

## FR-2 — Security Signals

Capture security signals including, where supported by the actual application:

* OTP failures
* OTP abuse
* repeated authentication failures
* suspicious login activity
* unauthorized access attempts
* permission failures
* abnormal order activity
* suspicious account behavior
* repeated failed operations
* rate-limit violations
* unusual administrative activity

Security signals must be emitted from actual domain events rather than fabricated from UI state.

---

## FR-3 — Admin Security Dashboard

Implement:

```text
app/(admin)/admin/security
```

as a production-ready dashboard.

The dashboard must display:

### Security Overview

* active security alerts
* critical alerts
* warning alerts
* security events over time
* authentication failures
* OTP abuse
* suspicious activity
* rate-limit violations

### Security Event Feed

Each event should provide:

* event type
* severity
* timestamp
* source
* affected tenant/store where appropriate
* relevant user/account reference where appropriate
* status
* trace ID where available

---

## FR-4 — Aggregated Security Metrics

Admins must be able to view aggregated metrics such as:

* authentication failure rate
* OTP failure rate
* suspicious login rate
* unauthorized access attempts
* rate-limit violations
* suspicious order activity
* security events by severity
* security events over time

---

# Technical Observability Requirements

## FR-5 — OpenTelemetry

OpenTelemetry is the standard instrumentation layer.

Instrument the actual Kasebino application.

Automatically instrument where appropriate:

* HTTP server
* HTTP clients
* database
* Redis
* supported runtime operations

Add manual instrumentation for important business operations.

Examples:

```text
invoice.create
invoice.update
invoice.submit
payment.create
order.create
customer.create
product.create
inventory.update
erpnext.sync
erpnext.invoice.create
erpnext.payment.create
erpnext.customer.sync
```

Only meaningful business operations should receive custom spans.

---

## FR-6 — Distributed Tracing

Jaeger is the primary distributed tracing backend.

Important requests must be traceable through:

```text
Client
  ↓
Kasebino API
  ↓
Authentication
  ↓
Authorization
  ↓
Database
  ↓
Redis
  ↓
ERPNext
  ↓
Queue
  ↓
Worker
```

Traces must include appropriate:

* `trace_id`
* `span_id`
* service name
* operation
* duration
* status

---

## FR-7 — Error Tracking Through Traces

Application exceptions must be recorded through OpenTelemetry.

Failed spans must contain:

```text
exception.type
exception.message
exception.stacktrace
```

and be marked with an error status.

Jaeger must therefore provide visibility into errors occurring inside distributed traces.

A separate error tracking platform such as Sentry is not required for this ADR.

---

## FR-8 — ERPNext Observability

ERPNext must not remain a black box.

At minimum, Kasebino → ERPNext requests must be traced.

ERPNext operations must expose useful telemetry including:

* request duration
* HTTP status
* operation
* DocType
* errors
* timeouts
* synchronization failures

Where the ERPNext deployment is controlled by the platform, deeper Frappe instrumentation should be implemented through a custom Frappe application/module rather than modifying ERPNext core.

Where direct ERPNext instrumentation is not possible, external monitoring must still cover:

* ERPNext availability
* HTTP latency
* HTTP errors
* queue health
* worker health
* scheduler health
* database health
* infrastructure health

---

## FR-9 — Trace Propagation

W3C Trace Context must be propagated where technically supported.

The same trace should correlate:

```text
Kasebino API
    ↓
ERPNext API
    ↓
ERPNext operation
```

Background operations should preserve correlation where technically possible:

```text
API
 ↓
queue.publish
 ↓
worker.consume
 ↓
erpnext.sync
```

---

## FR-10 — Prometheus Metrics

Prometheus is the primary metrics backend.

Metrics must cover:

### HTTP

* request rate
* request duration
* P50/P95/P99 latency
* error rate
* 4xx
* 5xx
* requests in flight

### Database

* connection pool usage
* connection count
* query latency
* database errors
* slow-query indicators where available

### Redis

* connection health
* command latency
* command errors
* connection count

### Queue / Workers

* queue depth
* jobs pending
* jobs processing
* jobs completed
* jobs failed
* retries
* processing duration
* wait time

### ERPNext

* request rate
* request latency
* error rate
* timeout rate
* synchronization success
* synchronization failures
* important ERPNext operations

### Infrastructure

Where applicable:

* CPU
* memory
* disk
* network
* container health
* process health

---

# FR-11 — Cardinality Protection

Prometheus metrics must not use high-cardinality labels such as:

```text
tenant_id
store_id
user_id
request_id
trace_id
```

unless there is a strong, explicitly justified reason.

Prefer low-cardinality labels such as:

```text
service
route
method
status_code
environment
operation
```

High-cardinality data belongs in:

* traces
* logs
* security events

---

# FR-12 — Structured Logging

Application logs must use a consistent structured format where appropriate.

Logs should include:

```text
timestamp
level
service
environment
message
trace_id
span_id
request_id
```

Tenant/store context may be included when appropriate and safe.

The following must never be logged:

* passwords
* OTP values
* JWTs
* cookies
* authorization headers
* API keys
* ERPNext credentials
* payment credentials
* other secrets

---

# FR-13 — Grafana

Grafana is the central observability dashboard and alerting interface.

Grafana must be provisioned automatically with:

* Prometheus datasource
* Jaeger datasource
* required dashboards
* required alert rules

No manual configuration should be required after deployment.

---

# FR-14 — Required Dashboards

## System Overview

Display:

* request rate
* error rate
* P50/P95/P99 latency
* CPU
* memory
* database health
* Redis health
* queue health
* ERPNext health

## API Dashboard

Display:

* requests/sec
* latency
* error rate
* 4xx
* 5xx
* slow endpoints

## Database Dashboard

Display:

* connections
* pool utilization
* query latency
* errors
* slow-query indicators

## Redis Dashboard

Display:

* connections
* commands
* latency
* errors

## Queue / Worker Dashboard

Display:

* pending jobs
* processing jobs
* failed jobs
* retries
* queue depth
* processing time
* wait time

## ERPNext Dashboard

Display:

* ERPNext request rate
* P50/P95/P99 latency
* ERPNext error rate
* timeouts
* synchronization failures
* worker health
* queue health
* database health

## Security Dashboard

Display:

* active alerts
* critical alerts
* authentication failures
* OTP abuse
* suspicious activity
* unauthorized access attempts
* rate-limit violations
* security events over time

## Business Operations Dashboard

Where actual application metrics are available:

* invoices created
* invoices failed
* payments created
* orders created
* products synchronized
* customers synchronized
* ERPNext synchronization failures

Do not create business metrics that cannot be measured reliably.

---

# FR-15 — Grafana Alerts

Alerts must be actionable and low-noise.

### Critical

Examples:

* API unavailable
* database unavailable
* Redis unavailable
* ERPNext unavailable
* extremely high API error rate
* queue completely stuck
* critically full disk

### Warning

Examples:

* high P95 latency
* increasing error rate
* high database pool utilization
* high CPU
* high memory
* ERPNext latency degradation
* ERPNext synchronization failures
* increasing queue backlog

Security alerts must also support severity-based classification.

---

# FR-16 — Metric → Trace → Error Correlation

Grafana must provide navigation from metrics to relevant traces.

The intended investigation flow is:

```text
Metric
  ↓
Trace
  ↓
Span
  ↓
Exception
```

Example:

```text
ERPNext P95 latency increased
          ↓
ERPNext trace
          ↓
SalesInvoice.create = 2.4s
          ↓
ERPNext validation span
          ↓
ERPNextValidationError
```

---

# FR-17 — Health Checks

Health/readiness checks must exist for critical services.

At minimum:

* Kasebino API
* database
* Redis
* ERPNext
* workers
* queues
* OpenTelemetry Collector

Monitoring infrastructure itself must also expose health information.

---

# FR-18 — Docker Compose

Provide a dedicated, production-oriented Docker Compose configuration for observability.

The stack must include:

* OpenTelemetry Collector
* Jaeger
* Prometheus
* Grafana

Add infrastructure exporters only where required by the actual deployment.

Do not create duplicate infrastructure services.

Use pinned versions and persistent storage.

---

# FR-19 — Persistence and Retention

Monitoring data must not be completely ephemeral.

Persist:

* Prometheus data
* Jaeger data
* Grafana configuration/data as appropriate

Define retention policies.

Do not retain unlimited traces.

Implement sampling appropriate for the expected production traffic.

Errors and slow traces should receive priority over normal successful traces when sampling is required.

---

# FR-20 — Observability Failure Isolation

Monitoring failure must never break the application.

For example:

```text
Jaeger unavailable
      ↓
Kasebino continues operating
```

not:

```text
Jaeger unavailable
      ↓
Kasebino API fails
```

Telemetry export must be asynchronous, bounded, retried where appropriate, and fail-safe.

---

# FR-21 — Tenant Awareness

Security events and traces must support tenant/store context where appropriate.

For example:

```text
tenant_id
store_id
```

may be attached to traces and security events.

However, tenant/store identifiers must not be blindly introduced as Prometheus labels due to cardinality concerns.

---

# Technical Design

## Telemetry Flow

```text
Kasebino
   │
   ├── Traces
   └── Metrics
        │
        ▼
OpenTelemetry Collector
        │
        ├──────────────→ Jaeger
        │
        └──────────────→ Prometheus
                              │
                              ▼
                           Grafana
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                Dashboards             Alerts
```

Security events remain part of the application security domain and are queryable by the Admin Security Dashboard.

Where security events originate from an instrumented operation, they should contain the related `trace_id` so administrators can investigate the underlying request.

---

# Security Considerations

Observability infrastructure must be treated as sensitive infrastructure.

The implementation must:

* protect Grafana access
* avoid exposing Prometheus publicly
* restrict Jaeger access
* protect OTLP endpoints
* avoid secrets in telemetry
* avoid credentials in logs
* avoid sensitive payload capture
* avoid storing raw authentication credentials
* respect tenant isolation

Request bodies should not be captured by default.

ERPNext credentials and tokens must never appear in traces or logs.

---

# Iranian User Experience Requirements

The Admin Security Dashboard must be fully localized in Persian.

Requirements:

* Persian UI
* RTL layout
* Jalali timestamps
* Persian number formatting where appropriate
* severity labels localized
* security event descriptions localized
* clear human-readable alert explanations

Technical dashboards may expose technical identifiers such as:

```text
trace_id
span_id
service.name
```

when required for engineering investigation.

---

# Dependencies

* ADR-110 (MongoDB Analytics Runtime)
* ADR-075 (Monitoring and Alerting Strategy)

Additional implementation dependencies:

* OpenTelemetry
* OpenTelemetry Collector
* Jaeger
* Prometheus
* Grafana
* existing Kasebino runtime infrastructure
* ERPNext/Frappe integration

---

# Implementation Requirements

The implementation must begin with a full repository audit.

The implementation must:

1. Inspect the existing architecture.
2. Inspect current Docker Compose configuration.
3. Inspect current logging.
4. Inspect existing security monitoring.
5. Inspect authentication/authorization events.
6. Inspect ordering/invoice/payment flows.
7. Inspect queues and workers.
8. Inspect database and Redis integration.
9. Inspect ERPNext integration.
10. Implement the observability stack.
11. Instrument the actual application.
12. Instrument important business operations.
13. Implement ERPNext observability.
14. Implement security monitoring hooks.
15. Implement Grafana dashboards.
16. Implement Grafana alerts.
17. Implement Jaeger tracing.
18. Implement Prometheus metrics.
19. Implement health checks.
20. Validate everything end-to-end.

Observability implementation must not modify unrelated business behavior.

---

# Completion Criteria

* [ ] `createNoopSecurityMonitoringPort` replaced with a real implementation.
* [ ] Authentication security events wired to monitoring.
* [ ] Ordering/business security events wired to monitoring.
* [ ] Admin Security Dashboard completed.
* [ ] Security metrics implemented.
* [ ] Real-time security alerts implemented.
* [ ] OpenTelemetry integrated into Kasebino.
* [ ] OpenTelemetry Collector deployed.
* [ ] Jaeger deployed and receiving traces.
* [ ] Prometheus deployed and receiving metrics.
* [ ] Grafana deployed and provisioned.
* [ ] API tracing implemented.
* [ ] Database/Redis observability implemented.
* [ ] Queue/worker observability implemented.
* [ ] ERPNext integration tracing implemented.
* [ ] ERPNext health/latency/error monitoring implemented.
* [ ] ERPNext synchronization monitoring implemented.
* [ ] Trace propagation implemented where supported.
* [ ] Exceptions recorded inside traces.
* [ ] Structured logging standardized where necessary.
* [ ] Trace IDs correlated with relevant logs/security events.
* [ ] Metric → Trace correlation configured.
* [ ] Grafana dashboards completed.
* [ ] Grafana alerts completed.
* [ ] Health checks implemented.
* [ ] Persistence and retention configured.
* [ ] Sampling strategy configured.
* [ ] Monitoring stack secured.
* [ ] Sensitive information excluded from telemetry.
* [ ] Telemetry failure does not break application functionality.
* [ ] Development/staging/production environments separated.
* [ ] End-to-end observability test completed.
* [ ] ERPNext end-to-end monitoring verified.
* [ ] Documentation completed.

---

# Expected Result

The final platform must provide a unified operational and security view:

```text
                         KASEBINO
                            │
                 ┌──────────┴──────────┐
                 │                     │
            Security Events       Application
                 │                     │
                 │              OpenTelemetry
                 │                     │
                 │              OTel Collector
                 │                 │      │
                 │              Traces  Metrics
                 │                 │      │
                 │              Jaeger Prometheus
                 │                 │      │
                 └─────────────┬───┴──────┘
                               ▼
                            Grafana
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
          Security         Technical        Business
          Dashboard        Dashboard        Dashboard
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                        Admin Investigation
                               │
                    Metric → Trace → Error
```

The system is considered complete only when an administrator or engineer can start from a security alert, technical metric, ERPNext failure, or slow business operation and reliably trace the problem to its underlying request, service, span, and exception where available.
