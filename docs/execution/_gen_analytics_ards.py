# -*- coding: utf-8 -*-
"""Generate ARD-021..028 and update STATUS/README. Documentation only."""
from pathlib import Path

ROOT = Path(r"C:\Users\Hadi\Desktop\projects\kasbino")
TODAY = "2026-08-03"


def w(rel: str, content: str) -> None:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content.strip() + "\n", encoding="utf-8")
    print("wrote", rel)


def ard(
    id_,
    title,
    milestone,
    objective,
    business,
    requirements,
    deps,
    architecture,
    domain,
    apis,
    events,
    mongo,
    pg,
    caching,
    security,
    acceptance,
    impl,
    ui=False,
):
    deps_s = "\n".join(f"- {d}" for d in deps)
    req_s = "\n".join(f"- {r}" for r in requirements)
    ev_s = "\n".join(f"- `{e}`" for e in events)
    acc = "\n".join(f"- [ ] {a}" for a in acceptance)
    im = "\n".join(f"- [ ] {i}" for i in impl)
    ui_block = (
        "- **uiuxpromax REQUIRED** before UI\n- Follow docs/uiux/*"
        if ui
        else "- No end-user UI (or admin-only deferred to listed deps)"
    )
    return f"""
# {id_} — {title}

| Field | Value |
| --- | --- |
| ID | {id_} |
| Title | {title} |
| Status | `todo` |
| Milestone | {milestone} |
| Owner | AI via ard-to-code |
| Last updated | {TODAY} |
| Source | PRD.md + docs/product/analytics-requirements.md |

## Objective

{objective}

## Business Value

{business}

## Requirements

{req_s}

## Dependencies

{deps_s}

## Architecture

{architecture}

## Domain Model

{domain}

## API Contracts

{apis}

## Events

{ev_s}

## Persistence Strategy

### PostgreSQL + Drizzle (OLTP)

{pg}

### MongoDB (analytics / audit / telemetry)

{mongo}

**ORM note:** Drizzle remains the only SQL ORM. MongoDB uses the official MongoDB driver/adapters — not an alternate SQL ORM.

## Database Design

### MongoDB collections (logical)

{mongo}

### Query Patterns

Merchant-scoped analytics/audit queries always filter `merchantId`. Platform admin queries are role-gated and access-audited.

### Estimated Load

Design for high-volume append (clickstream + mirrored domain events) at 50k merchants envelope without impacting POS OLTP.

### Caching Plan

{caching}

### Migration Plan

- Compose/service: MongoDB in local/staging/prod topologies  
- Collection bootstrap + indexes declared in ARD implementation plan  
- No PostgreSQL destructive changes required unless dual-write audit bridge needs columns  

## Security

{security}

## Analytics / Audit / Tracking Requirements (mandatory section)

Before implementation, enumerate:

- Required analytics events  
- Required audit events  
- Required tracking events  
- Required dashboard metrics  

See `docs/architecture/analytics-architecture.md` and related docs.

## UI Requirements

{ui_block}

## Testing

- Ingest idempotency tests  
- Tenant isolation tests  
- Failure isolation: OLTP success when Mongo down (buffered)  
- Retention/TTL configuration review  

## Acceptance Criteria

{acc}
- [ ] Analytics/audit/tracking event list documented in progress-log
- [ ] MongoDB indexes reviewed
- [ ] Tenant isolation reviewed
- [ ] Failure isolation from OLTP verified
- [ ] Drizzle/PostgreSQL boundaries respected (no SoT bleed)

## Definition of Done

Inherits global DoD + database quality gate where PG touched + MongoDB rules + analytics/audit rules.

## Implementation Checklist

{im}
- [ ] Read analytics/audit/mongodb/warehouse/observability architectures
- [ ] uiuxpromax if UI
- [ ] Tests + docs + STATUS update

## Validation Checklist

- [ ] lint / typecheck / tests (when code phase runs)
- [ ] mongodb-rules + analytics-rules + audit-rules conformance
- [ ] architecture validation

## Completion Protocol

Update STATUS + progress-log; only complete after validation.
"""


ARDS = []

ARDS.append(
    (
        "ard-021-analytics-platform.md",
        ard(
            "ARD-021",
            "Analytics Platform",
            "M3",
            "Establish the MongoDB-backed analytics platform foundation: ingest ports, shared envelope, idempotent writers, outbox→warehouse bridge skeleton, env/compose Mongo, and module scaffolding for downstream analytics ARDs.",
            "Unblocks product analytics, audit scale, clickstream, and management reporting without endangering POS OLTP.",
            ["PA-01", "PA-02", "PA-09", "PA-11", "PA-12", "NFR-05 related"],
            ["ARD-001", "ARD-015 recommended for realtime hooks", "ARD-019 for prod topology"],
            "New modules `analytics` + shared `infrastructure/mongodb`. AnalyticsIngestPort + OutboxWarehouseConsumer. Does not replace ARD-016 PG projections.",
            "No OLTP aggregates. Application services: IngestEvent, MirrorDomainEvent. Ports only in domain/application sense for analytics BC.",
            """| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/analytics/ingest` | authenticated/batched track |
| GET | `/api/v1/analytics/health/mongo` | internal/ready dependency optional |""",
            ["WarehouseMirrorFailed (ops)", "AnalyticsIngestAccepted (optional)"],
            "Bootstrap `mos_events`, `mos_product` stubs; unique eventId; merchantId+occurredAt indexes; docker mongo service.",
            "No new OLTP tables required beyond existing outbox. Ready probe may soft-depend on Mongo.",
            "Optional short Redis debounce for client batch tokens; not primary store.",
            "Ingest authZ; rate limit track endpoints; no secrets in payloads.",
            [
                "Mongo available in compose",
                "Idempotent ingest by eventId",
                "Domain outbox can mirror at least one event type end-to-end",
                "POS complete unaffected when Mongo stopped (retry/buffer)",
            ],
            [
                "Mongo client adapter",
                "Envelope validation (Zod)",
                "Outbox bridge worker",
                "Module folders + docs",
            ],
            ui=False,
        ),
    )
)

ARDS.append(
    (
        "ard-022-audit-logging-system.md",
        ard(
            "ARD-022",
            "Audit Logging System",
            "M5",
            "Implement immutable audit logging to MongoDB for all sensitive actions, with admin query APIs, retention, and hooks from auth/merchant/sale/admin flows.",
            "Compliance evidence, fraud forensics, admin accountability.",
            ["PA-03", "PA-10", "NFR-10", "security audit requirements"],
            ["ARD-021", "ARD-002", "ARD-003", "ARD-018 hooks"],
            "AuditPort called from application services; Mongo `mos_audit` insert-only; optional PG thin audit retained for bootstrap compatibility.",
            "AuditRecord as infrastructure/persistence model; policies for sensitive action catalog.",
            """| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/admin/audit` | platform_admin filters |
| GET | `/api/v1/admin/audit/:eventId` | |""",
            ["AuditRecordWritten"],
            "`mos_audit` indexes: merchantId+occurredAt, actorId+occurredAt, action+occurredAt, unique eventId; TTL per retention doc.",
            "Optional `audit_logs` PG kept thin; prefer Mongo for query/scale.",
            "Do not cache audit search results broadly.",
            "Admin-only reads; access audited; PII minimization in before/after.",
            [
                "Sensitive actions listed in audit-architecture produce records",
                "Admin can search by merchant/actor/action/time",
                "No update/delete API for audit docs",
                "Retention policy configured",
            ],
            ["AuditPort", "Sensitive action instrumentation matrix", "Admin query UI optional via 025/018", "Tests"],
            ui=True,
        ),
    )
)

ARDS.append(
    (
        "ard-023-product-analytics.md",
        ard(
            "ARD-023",
            "Product Analytics",
            "M3",
            "Instrument product analytics for feature usage, activation correlation, POS UX timings, and funnel inputs using MongoDB product collections.",
            "Learn what drives retention product-market fit; prioritize roadmap from evidence.",
            ["PA-01", "PA-05", "PA-06"],
            ["ARD-021", "ARD-007 for POS timings", "ARD-010 for storefront"],
            "Feature keys registry doc; server+client track helpers calling ingest; rollups for feature adoption.",
            "FeatureUsagePolicy / analytics application services only.",
            """| Method | Path |
| --- | --- |
| POST | `/api/v1/analytics/track` |
| GET | `/api/v1/admin/product-analytics/features` |""",
            ["FeatureUsed", "PosCheckoutCompleted", "DashboardWidgetViewed", "AppOpened"],
            "`mos_product` events + `mos_product_rollups`.",
            "None as SoT; may read merchant activation flags from PG read models.",
            "Rollup cache Redis TTL 60–300s for admin widgets.",
            "No OTP/JWT in properties; hash phones if needed.",
            [
                "Feature usage visible for key features (POS, loyalty, storefront)",
                "Activation funnel events present",
                "POS checkout duration events recorded",
            ],
            ["Feature key registry in docs", "Track helpers", "Minimal admin view or API", "Tests"],
            ui=True,
        ),
    )
)

ARDS.append(
    (
        "ard-024-event-warehouse.md",
        ard(
            "ARD-024",
            "Event Warehouse",
            "M3",
            "Complete domain event warehousing: mirror full MVP event catalog into MongoDB with payload versioning, backfill strategy from outbox, and query patterns for investigations.",
            "Durable analytical history of business events separate from realtime EMQX.",
            ["PA-02", "PA-09"],
            ["ARD-021", "event-catalog.md coverage", "outbox from ARD-001+"],
            "Warehouse consumer maps all catalog eventTypes; DLQ for poison messages; metrics on lag.",
            "No domain changes; integration service only.",
            """| Method | Path |
| --- | --- |
| GET | `/api/v1/admin/warehouse/events` | admin search |""",
            ["All MVP domain events from event-catalog.md"],
            "`mos_events` (or stream-partitioned collections); indexes eventType+occurredAt, merchantId+occurredAt.",
            "Outbox remains PG via Drizzle.",
            "N/A heavy caching.",
            "Admin-only warehouse browse; tenant filters enforced.",
            [
                "All catalog domain events mirrored",
                "Idempotent on eventId",
                "Lag metrics exposed",
                "Mongo outage does not block OLTP",
            ],
            ["Mapping table eventType→collection", "Consumer hardening", "Admin query", "Tests"],
            ui=False,
        ),
    )
)

ARDS.append(
    (
        "ard-025-management-dashboards.md",
        ard(
            "ARD-025",
            "Management Dashboards",
            "M5",
            "Build platform management dashboards: activation, engagement, commerce proxies, reliability, and trust & safety widgets for platform admins.",
            "Operate the SaaS portfolio and spot growth/risk early.",
            ["PA-07", "platform metrics from PRD"],
            ["ARD-021", "ARD-023", "ARD-024", "ARD-018"],
            "Read from Mongo rollups + selective PG aggregates; uiuxpromax admin UI section.",
            "Read models only.",
            """| Method | Path |
| --- | --- |
| GET | `/api/v1/admin/mgmt/overview` |
| GET | `/api/v1/admin/mgmt/activation` |
| GET | `/api/v1/admin/mgmt/engagement` |""",
            ["MgmtRollupUpdated"],
            "`mos_mgmt` daily/hourly rollups.",
            "Financial truth endpoints may proxy PG analytics where required.",
            "Redis TTL 60–900s on mgmt widgets.",
            "platform_admin only.",
            [
                "Overview renders for admin",
                "Activation + engagement widgets live",
                "Freshness SLA documented and met for standard tier",
            ],
            ["uiuxpromax dashboards", "Rollup jobs", "APIs", "Tests"],
            ui=True,
        ),
    )
)

ARDS.append(
    (
        "ard-026-security-monitoring.md",
        ard(
            "ARD-026",
            "Security Monitoring",
            "M5",
            "Implement security monitoring signals from auth, rate limits, admin actions, and anomaly hooks; alert via EMQX admin topics and persistence in Mongo security collections.",
            "Reduce fraud/abuse impact; support ADM-02/03.",
            ["PA-08", "ADM-02", "ADM-03"],
            ["ARD-021", "ARD-022", "ARD-002", "ARD-015", "ARD-018"],
            "Rules evaluation (batch MVP); security collection; alert publisher.",
            "SecuritySignal value/documents; rule definitions config.",
            """| Method | Path |
| --- | --- |
| GET | `/api/v1/admin/security/signals` |
| GET | `/api/v1/admin/security/alerts` |""",
            ["RateLimitTriggered", "AuthOtpFailed", "SuspiciousAccessPattern", "AdminMerchantSuspended"],
            "`mos_security` signals + alerts.",
            "Reads rate-limit/auth metadata optionally from Redis/PG.",
            "Short TTL cache for alert boards.",
            "Strict admin authZ; viewing audited.",
            [
                "OTP failure spikes raise signal",
                "Rate limit triggers recorded",
                "Admin alert channel/topic wired",
            ],
            ["Signal writers", "Simple rules", "Admin UI list", "Tests"],
            ui=True,
        ),
    )
)

ARDS.append(
    (
        "ard-027-user-behavior-tracking.md",
        ard(
            "ARD-027",
            "User Behavior Tracking",
            "M4",
            "Deliver clickstream and session analytics across merchant app and storefront, including batch beacon ingest and session heartbeats.",
            "Understand UX friction and storefront conversion paths.",
            ["PA-04", "PA-06"],
            ["ARD-021", "ARD-010", "ARD-013"],
            "Client tracker (lightweight) + beacon API; session timeout 30m; sampling policy for noisy events.",
            "Session/clickstream as telemetry models only.",
            """| Method | Path |
| --- | --- |
| POST | `/api/v1/analytics/beacon` | batch events |
| POST | `/api/v1/analytics/session` | start/heartbeat/end |""",
            ["PageViewed", "ElementClicked", "SessionStarted", "SessionHeartbeat", "SessionEnded", "StorefrontViewed", "ProductDetailViewed"],
            "`mos_behavior` time-series; TTL 90–180d.",
            "None.",
            "Client may queue offline (PWA) then beacon.",
            "Rate limit beacons; strip PII; CORS locked to app origins.",
            [
                "Sessions created and heartbeaten",
                "Page views stored with merchant scoping",
                "Storefront funnel events 100% sampled",
            ],
            ["Beacon API", "Client integration guidelines doc", "TTL indexes", "Tests"],
            ui=False,
        ),
    )
)

ARDS.append(
    (
        "ard-028-observability-and-monitoring.md",
        ard(
            "ARD-028",
            "Observability & Monitoring",
            "M5",
            "Unify observability with analytics correlation: structured logs, OTel traces/metrics, health/ready including Mongo, dashboards for golden signals, and runbooks linking audit/security signals.",
            "Operate reliably at scale; debug POS and analytics pipelines with shared correlationIds.",
            ["PA-12", "NFR-05", "overlaps ARD-020"],
            ["ARD-001", "ARD-021", "ARD-020 parallel hardening"],
            "Extend observability architecture; metric names for ingest lag, Mongo errors, OTP, checkout; correlate with warehouse eventIds.",
            "N/A",
            """| Method | Path |
| --- | --- |
| GET | `/api/health` | existing |
| GET | `/api/ready` | include mongo policy |""",
            ["OpsMetricEmitted (conceptual)"],
            "Uses Mongo health; does not store traces in Mongo by default.",
            "N/A",
            "N/A",
            "No PII in traces/logs; scrubbers required.",
            [
                "correlationId present across request→outbox→warehouse path",
                "Golden signals documented and scraped/exported",
                "Ready policy documents Mongo degradation mode",
            ],
            ["OTel wiring checklist", "Metric catalog doc", "Runbooks", "Tests/smoke"],
            ui=False,
        ),
    )
)

for fname, body in ARDS:
    w(f"docs/ards/{fname}", body)

# STATUS update
status_rows = []
for i in range(1, 21):
    # keep existing titles from prior board - simplified reload
    pass

w(
    "docs/ards/STATUS.md",
    f"""
# ARD Status Board

Last updated: {TODAY}

| ID | Title | Status | Completed at |
| --- | --- | --- | --- |
| ARD-001 | Project Foundation | todo | — |
| ARD-002 | Authentication | todo | — |
| ARD-003 | Merchant Management | todo | — |
| ARD-004 | Store Management | todo | — |
| ARD-005 | Product Catalog | todo | — |
| ARD-006 | Inventory | todo | — |
| ARD-007 | POS | todo | — |
| ARD-008 | Customer CRM | todo | — |
| ARD-009 | Loyalty | todo | — |
| ARD-010 | Storefront | todo | — |
| ARD-011 | Orders | todo | — |
| ARD-012 | Payments | todo | — |
| ARD-013 | Dashboard | todo | — |
| ARD-014 | Notifications | todo | — |
| ARD-015 | Realtime Layer | todo | — |
| ARD-016 | Analytics (Merchant OLTP Dashboards) | todo | — |
| ARD-017 | PWA | todo | — |
| ARD-018 | Admin Panel | todo | — |
| ARD-019 | Infrastructure | todo | — |
| ARD-020 | Production Hardening | todo | — |
| ARD-021 | Analytics Platform | todo | — |
| ARD-022 | Audit Logging System | todo | — |
| ARD-023 | Product Analytics | todo | — |
| ARD-024 | Event Warehouse | todo | — |
| ARD-025 | Management Dashboards | todo | — |
| ARD-026 | Security Monitoring | todo | — |
| ARD-027 | User Behavior Tracking | todo | — |
| ARD-028 | Observability & Monitoring | todo | — |

## Status values

- `todo` — not started
- `in_progress` — ard-to-code actively implementing
- `blocked` — dependency or external decision blocked
- `completed` — validation passed + DoD met

Only one ARD should be `in_progress` at a time for a given autonomous agent run.

## Suggested sequencing (analytics stream)

After foundation/auth/outbox: **021 → 024 → 022/023/027 (parallelizable) → 025/026 → 028** alongside core M1–M6 product ARDs.
""",
)

print("ARDS 021-028 done")
