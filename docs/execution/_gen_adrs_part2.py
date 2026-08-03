# -*- coding: utf-8 -*-
"""Part 2: cache, analytics, infra, security, testing, ops ADRs + writer."""
from pathlib import Path
import importlib.util

ROOT = Path(r"C:\Users\Hadi\Desktop\projects\kasbino")
spec = importlib.util.spec_from_file_location("p1", ROOT / "docs/execution/_gen_adrs_part1.py")
# Don't execute part1 fully if it only defines - better to merge into one file.

# Re-exec simpler: load RAW by running both definitions inline in this file completely.

ADRS_DIR = ROOT / "adrs"
ADRS_DIR.mkdir(exist_ok=True)

RAW = []

def add(n, slug, title, status, deps, context, problem, decision, why, alts, tradeoffs, tech, domain, analytics, security, impl, future, related=""):
    RAW.append(locals().copy())

# Import definitions by exec part1's add calls — instead duplicate remaining only and merge files.

exec(open(ROOT / "docs/execution/_gen_adrs_part1.py", encoding="utf-8").read().split("print(")[0])
# That redefines RAW and add and fills 1-50

# ---- CACHE 051-055 ----
add(51, "redis-architecture", "Redis Architecture", "Accepted", [4],
    "Cache and rate limits mandatory.",
    "App memory cache breaks multi-instance.",
    "Shared Redis for cache-aside and rate limiting; never SoT.",
    "Horizontal scale.",
    "In-process LRU only.",
    "Redis as dependency.",
    "Compose + managed.",
    "N/A",
    "Hit ratio metrics.",
    "Auth rate limits fail policy.",
    "All envs.",
    "Redis Cluster later.",
    "docs/tech/redis.md")

add(52, "cache-aside", "Cache-Aside Read Strategy", "Accepted", [51],
    "Hot reads: products, wallets, storefront.",
    "Write-through complexity.",
    "Cache-aside default: miss→PG→set TTL→return.",
    "Simple + correct SoT.",
    "Write-through default.",
    "Stampede risk—optional single-flight.",
    "Application cache helpers.",
    "Entity reads.",
    "Analytics 60s class.",
    "No PII in key names beyond hashed phone if needed.",
    "cache-strategy.md.",
    "Read-through framework avoid.",
    "07-cache-architecture.md")

add(53, "cache-keys-ttl", "Cache Key and TTL Standards", "Accepted", [52],
    "Need consistent keys.",
    "Collisions and stale forever.",
    "Pattern mos:{env}:m:{merchantId}:{domain}:{resource}:{id}; TTL entity 300s, analytics 60s, storefront 600s.",
    "Operable caching.",
    "Freeform keys.",
    "Short TTL more DB load.",
    "Documented map in cache-strategy.",
    "Membership/wallet keys include store.",
    "Dashboard caches 60s.",
    "Tenant in key.",
    "Every cache usage.",
    "Per-entity overrides via ADR.",
    "cache-strategy.md")

add(54, "cache-invalidation", "Cache Invalidation via Domain Events", "Accepted", [52, 36],
    "Mutations must not leave wrong prices/stock.",
    "TTL-only too stale for POS.",
    "Mutations emit events; CacheInvalidationService deletes keys; next read rebuilds.",
    "Event-driven freshness.",
    "Manual expire in every handler only.",
    "Must keep key maps updated.",
    "Subscriber in-process + reliable via outbox side effects.",
    "Product/Sale/Order/Membership events.",
    "N/A",
    "N/A",
    "event-catalog invalidation columns.",
    "Versioned cache keys later.",
    "")

add(55, "rate-limiting", "Rate Limiting Strategy", "Accepted", [51, 30],
    "OTP abuse and scraping.",
    "Unlimited APIs fail.",
    "Redis fixed-window/token bucket: default 10 rps; auth 5/min; OTP 3/min; admin 20 rps.",
    "PRD §11.4.",
    "Edge WAF only.",
    "False positives—tune.",
    "Middleware counters.",
    "N/A",
    "RateLimitTriggered security events.",
    "Critical for OTP.",
    "All public/auth routes.",
    "Adaptive limits later.",
    "")

# ---- ANALYTICS MONGO 056-065 ----
add(56, "mongodb-analytics-plane", "MongoDB Analytics and Telemetry Plane", "Accepted", [14, 4],
    "High-volume telemetry and audit.",
    "OLTP overload.",
    "MongoDB for warehouse, audit, clickstream, product analytics, security signals, mgmt rollups—not money/stock SoT.",
    "Protect POS; flexible docs.",
    "ClickHouse now; Elastic now.",
    "Second datastore ops.",
    "MONGODB_URI; adapters only in analytics/audit modules.",
    "No authoritative ledgers in Mongo.",
    "All PA-* streams.",
    "Tenant filters; admin gates.",
    "ARD-021+; supersedes decisions ADR-0008 number.",
    "Warehouse→CH later ADR.",
    "mongodb-architecture.md")

add(57, "event-warehouse", "Event Warehouse Architecture", "Accepted", [56, 35, 36],
    "Need durable analytical history of domain events.",
    "Scanning PG sales for every investigation bad.",
    "Outbox bridge mirrors domain events to Mongo mos_events idempotent by eventId.",
    "Investigation + aggregations.",
    "Only EMQX retain; only PG.",
    "Storage growth—TTL 24m.",
    "Consumer worker.",
    "Full catalog mirror.",
    "Lag metrics.",
    "Admin browse only.",
    "ARD-024.",
    "Cold storage archive.",
    "event-warehouse-architecture.md")

add(58, "audit-logging", "Audit Logging Architecture", "Accepted", [56, 34],
    "Compliance and forensics.",
    "App logs insufficient as evidence.",
    "Insert-only Mongo mos_audit for sensitive actions; optional thin PG; no update API.",
    "Evidence grade.",
    "PG-only audit forever.",
    "Async delay.",
    "AuditPort after commit.",
    "Auth, money, admin, stock adjust.",
    "N/A",
    "Access to audit audited.",
    "ARD-022.",
    "Hash chain optional.",
    "audit-architecture.md")

add(59, "product-analytics", "Product Analytics Architecture", "Accepted", [56],
    "Need feature adoption and activation insight.",
    "Guessing roadmap.",
    "Track FeatureUsed and funnel events to Mongo; feature key registry; dual-read money from PG.",
    "Evidence-based product.",
    "Only Google Analytics SaaS.",
    "Privacy care.",
    "ingest/track APIs.",
    "N/A domain.",
    "Funnels activation/POS/storefront.",
    "No secrets in props.",
    "ARD-023.",
    "Experimentation later.",
    "product-analytics-architecture.md")

add(60, "behavior-clickstream", "User Behavior and Clickstream Tracking", "Accepted", [56, 59],
    "UX friction unknown.",
    "No path data.",
    "Beacon batched PageViewed/ElementClicked; store-scoped; sample noisy; 100% funnel events.",
    "UX improvement.",
    "Full session replay MVP.",
    "Volume—TTL 90–180d.",
    "beacon API.",
    "N/A",
    "Path analysis.",
    "PII scrub; CORS.",
    "ARD-027.",
    "Heatmaps later.",
    "user-behavior-tracking-architecture.md")

add(61, "session-analytics", "Session Analytics", "Accepted", [60],
    "Need engagement duration.",
    "Anonymous multi-tab confusion.",
    "sessionId client UUID; heartbeat; 30m idle timeout; Session* events.",
    "Engagement KPIs.",
    "Server sessions only.",
    "Approx boundaries.",
    "session API.",
    "N/A",
    "Sessions/day metrics.",
    "N/A",
    "ARD-027.",
    "Identity stitch post-login.",
    "")

add(62, "management-dashboard-analytics", "Management Dashboard Analytics", "Accepted", [57, 59],
    "Platform leadership needs portfolio metrics.",
    "Merchant dashboards insufficient for SaaS ops.",
    "Mongo mos_mgmt rollups for activation/engagement; money reconciles to PG; admin-only.",
    "Operate SaaS.",
    "Export CSV only.",
    "Rollup jobs.",
    "ARD-025 APIs.",
    "N/A",
    "DAM/MAM proxies.",
    "platform_admin.",
    "ARD-025.",
    "Executive email digests.",
    "management-dashboards-architecture.md")

add(63, "merchant-oltp-dashboards", "Merchant OLTP Dashboard Analytics", "Accepted", [41, 54, 9],
    "Merchants need revenue/retention KPIs.",
    "Mongo not for monetary truth.",
    "PostgreSQL projection tables + Redis 60s for AN-01..04 including North Star.",
    "Accurate merchant finance/retention.",
    "Compute live SUM on each request.",
    "Projection maintenance.",
    "ARD-016.",
    "SaleCompleted updates projections.",
    "Widget views product analytics.",
    "Merchant scoped.",
    "ARD-013,016.",
    "More cohorts later.",
    "")

add(64, "data-retention", "Data Retention Strategy", "Accepted", [56, 58, 41],
    "Cost, privacy, compliance.",
    "Keep forever expensive/risky.",
    "Retention matrix: clickstream 90–180d; warehouse 24m; audit 24–36m; OLTP business records indefinite with Phase-2 archive; legal hold overrides.",
    "Balance.",
    "Single TTL all data.",
    "Legal ambiguity open Q.",
    "Mongo TTL indexes; jobs.",
    "Soft delete ≠ analytics delete.",
    "N/A",
    "Compliance.",
    "data-retention-architecture.md.",
    "Legal ADR when counsel decides.",
    "")

add(65, "analytics-failure-isolation", "Analytics Ingest Failure Isolation", "Accepted", [56, 35, 9],
    "Mongo may be down.",
    "Blocking checkout on analytics loses sales.",
    "After OLTP commit, analytics/audit via outbox/buffer; POS success independent of Mongo.",
    "PA-09 / reliability.",
    "Sync Mongo in TX with sale.",
    "Telemetry delay.",
    "Outbox / queue.",
    "Sale path sacred.",
    "Ingest error metrics/alerts.",
    "N/A",
    "All CompleteSale and track paths.",
    "DLQ dashboards.",
    "")

# ---- INFRA 066-075 ----
add(66, "docker-compose", "Docker and Compose Local Parity", "Accepted", [4],
    "Dev/prod parity.",
    "Works on my machine.",
    "Compose: app, postgres, redis, emqx, minio, mongo; healthchecks; named volumes.",
    "Onboarding speed.",
    "Dev services unmanaged local installs only.",
    "Heavier laptops.",
    "docker-compose.yml ARD-001/019.",
    "N/A",
    "N/A",
    "Don't commit secrets.",
    "ARD-001.",
    "Tilt/devspace later.",
    "12-infrastructure-architecture.md")

add(67, "containerization", "Containerization Standards", "Accepted", [66],
    "Need deployable artifacts.",
    "Fat images insecure.",
    "Multi-stage Dockerfile; non-root; Next standalone; .dockerignore; no secrets baked.",
    "Production readiness.",
    "VM amber deploy.",
    "Build complexity.",
    "Image scan in CI when available.",
    "N/A",
    "N/A",
    "Critical.",
    "ARD-019.",
    "Distroless later.",
    "")

add(68, "env-secrets", "Environment and Secret Management", "Accepted", [66],
    "Many credentials.",
    "Secret leak fatal.",
    "Zod-validated env at boot; secrets via env/secret manager; .env.example only; per-env values.",
    "Safety.",
    "Commit .env.",
    "More setup.",
    "DATABASE_URL MONGODB_URI JWT SMS etc.",
    "N/A",
    "N/A",
    "Rotation procedures.",
    "All deploys.",
    "Vault/SOPS later.",
    "")

add(69, "cicd", "CI/CD Strategy", "Accepted", [67, 78],
    "Need quality gates.",
    "Manual deploy errors.",
    "CI: lint, typecheck, tests, migration review; CD to staging then prod with approvals; no skip hooks.",
    "DoD automation.",
    "Deploy from laptop.",
    "Pipeline maintenance.",
    "GitHub Actions assumed.",
    "N/A",
    "N/A",
    "Secret scan.",
    "ARD-019/020.",
    "Progressive delivery.",
    "")

add(70, "deployment-zero-downtime", "Deployment and Zero-Downtime Strategy", "Accepted", [67, 46, 71],
    "Availability NFR.",
    "Stop-the-world deploys lose sales.",
    "Stateless N≥2 instances; LB health; rolling/blue-green; migrate expand/contract first.",
    "NFR-03.",
    "Single instance prod.",
    "Needs capacity.",
    "Ready/health probes.",
    "N/A",
    "Deploy markers in logs.",
    "Drain connections.",
    "ARD-019/020.",
    "Canary.",
    "11-deployment-architecture.md")

add(71, "scalability-stateless", "Scalability Stateless Multi-Instance", "Accepted", [4, 33, 51],
    "Growth to many merchants.",
    "Sticky sessions / local memory limit scale.",
    "Stateless app; JWT; shared Redis/PG/Mongo/EMQX; horizontal scale behind LB.",
    "NFR-02.",
    "Vertical only.",
    "Shared DB becomes bottleneck—mitigate with indexes/cache/projections.",
    "No sticky required.",
    "N/A",
    "DAM capacity planning.",
    "N/A",
    "All services.",
    "Read replicas / partition ADR.",
    "")

add(72, "data-plane-deployment", "Data Plane Deployment Topology", "Accepted", [66, 41, 51, 56, 38, 40],
    "Multiple backing services.",
    "Undocumented topology.",
    "Deploy PG (SoT), Redis, Mongo (analytics), EMQX, MinIO alongside app; managed offerings preferred in prod; network isolation.",
    "Operable system.",
    "Single node all-in-one prod forever.",
    "Cost.",
    "Runbooks restart order PG→Redis→EMQX→MinIO→Mongo→app.",
    "N/A",
    "N/A",
    "Private networks TLS.",
    "ARD-019.",
    "Multi-AZ.",
    "")

add(73, "backup-dr", "Backup and Disaster Recovery", "Accepted", [72],
    "Data loss unacceptable.",
    "No backups.",
    "Daily PG backups min; Mongo backups per retention; MinIO versioning optional; documented restore drills.",
    "Business continuity.",
    "RAID is backup.",
    "RPO/RTO targets to refine.",
    "Ops runbooks.",
    "N/A",
    "N/A",
    "Encrypt backups.",
    "ARD-019/020.",
    "Cross-region.",
    "")

add(74, "observability", "Observability Logging Metrics Tracing", "Accepted", [29, 65],
    "Debug production.",
    "Blind ops.",
    "Structured JSON logs; OTel-ready traces; metrics golden signals; correlationId across request→outbox→warehouse.",
    "NFR-05.",
    "Only console.log.",
    "Cardinality management.",
    "shared/observability.",
    "N/A",
    "Golden signals include Mongo lag.",
    "Scrub OTP/JWT/PII.",
    "ARD-028.",
    "Vendor APM choice ADR.",
    "10-observability-architecture.md")

add(75, "monitoring-alerting", "Monitoring and Alerting Strategy", "Accepted", [74, 58],
    "Need proactive response.",
    "Silent Sev1.",
    "Alert on OTP failure spikes, checkout error rate, outbox lag, Mongo ingest errors, disk; security signals via ARD-026; pager path configurable.",
    "Ops maturity.",
    "Email everything.",
    "Alert fatigue—severity tiers.",
    "Metrics→alertmanager/etc.",
    "N/A",
    "Sev routing.",
    "Security alerts admin-only.",
    "ARD-026/028.",
    "SLO burn rates.",
    "")

# ---- SECURITY TEST OPS 076-085 ----
add(76, "security-architecture", "Security Architecture", "Accepted", [34, 55, 58],
    "Multi-tenant + payments + PII phones.",
    "Under-specified security.",
    "HTTPS, secure cookies, Zod, parameterized SQL, CSRF/XSS protections, tenant guards, audit, rate limits—as 06-security-architecture.",
    "Baseline trust.",
    "Security later.",
    "Ongoing cost.",
    "Checklist on ARD Done.",
    "PII minimization.",
    "Security monitoring.",
    "Core of ADR.",
    "ARD-020 pen smoke.",
    "Pentest vendor.",
    "06-security-architecture.md")

add(77, "api-protection", "API Protection and Data Protection", "Accepted", [76, 30, 55],
    "Public storefront + auth APIs.",
    "Injection/scraping/IDOR.",
    "Zod validation; authZ; rate limits; CORS locked; no sensitive fields on public DTOs; soft-delete defaults.",
    "Hardening.",
    "Trust client.",
    "False positives.",
    "ACL DTOs storefront.",
    "N/A",
    "Abuse signals.",
    "Critical.",
    "All public routes.",
    "WAF.",
    "")

add(78, "testing-strategy", "Testing Strategy", "Accepted", [2, 29],
    "Quality DoD.",
    "No tests → regressions in POS money paths.",
    "Pyramid: many domain unit; integration use cases+DB; few e2e auth/POS/pickup; perf smoke barcode/checkout; tenant isolation mandatory.",
    "Confidence.",
    "Only e2e.",
    "Slower CI.",
    "Vitest/Jest + Playwright planned.",
    "Invariants tested.",
    "N/A",
    "AuthZ tests.",
    "testing-rules.md.",
    "Contract tests for events.",
    "docs/testing/strategy.md")

add(79, "testing-layers", "Unit Integration E2E Performance Testing", "Accepted", [78],
    "Need layer guidance.",
    "Wrong layer tests expensive.",
    "Unit domain without DB; integration Testcontainers/Compose; e2e critical journeys; perf harness for barcode/checkout budgets.",
    "Efficient coverage.",
    "Manual only.",
    "Env flakiness—stabilize.",
    "CI jobs.",
    "CompleteSale covered.",
    "N/A",
    "N/A",
    "Each ARD test matrix.",
    "Chaos tests later.",
    "")

add(80, "error-handling", "Error Handling Strategy", "Accepted", [30, 74],
    "Failures everywhere.",
    "Inconsistent errors.",
    "Domain errors mapped to stable API codes; never leak stacks in prod; log with correlationId; user-safe messages.",
    "Supportability.",
    "Throw raw Error to client.",
    "Mapping tables.",
    "Shared error module.",
    "N/A",
    "Error rates.",
    "No secrets.",
    "All APIs.",
    "Problem+JSON later.",
    "")

add(81, "qr-acquisition", "QR Acquisition Architecture Decision", "Accepted", [6, 23, 7],
    "Physical to digital acquisition.",
    "No attribution.",
    "Stable storefront URL in QR with src=qr; printable assets; membership source=qr; analytics funnel.",
    "Growth loop.",
    "Only paper coupons.",
    "Print ops.",
    "ARD-033.",
    "MembershipCreated source.",
    "Conversion metrics.",
    "No secrets in QR.",
    "growth-loops-qr.md.",
    "Campaign QR ids.",
    "qr-acquisition-architecture.md")

add(82, "pickup-only-fulfillment", "Pickup-Only Fulfillment MVP Decision", "Accepted", [11, 15],
    "Fulfillment scope decision.",
    "Delivery complexity.",
    "MVP supports only in-store pickup; forbid delivery/courier/rider/shipping features without superseding ADR.",
    "Ship faster.",
    "Offer both now.",
    "Miss delivery merchants.",
    "UX hides delivery.",
    "Order.fulfillmentType=pickup.",
    "Pickup funnel only.",
    "Less PII addresses.",
    "ARD-034.",
    "Delivery ADR future.",
    "")

add(83, "sms-provider", "SMS Provider Selection Iran", "Proposed", [31, 32],
    "OTP requires SMS in Iran.",
    "Provider cost/reliability unknown.",
    "Keep SmsSender port; choose provider via this ADR when data available; console/dev adapter until then.",
    "Avoid lock-in.",
    "Hardcode provider now.",
    "Prod blocked until chosen.",
    "Adapter pattern.",
    "N/A",
    "Delivery rate metrics.",
    "Sender ID compliance.",
    "Unblocks AUTH prod.",
    "Accept when vendor picked.",
    "docs/decisions/ADR-0001")

add(84, "payment-psp", "Payment PSP Selection", "Proposed", [12],
    "Need real rails for OrderPaid.",
    "PSP undecided.",
    "PaymentGateway port + sandbox; select PSP in this ADR later.",
    "Architecture proceeds.",
    "Build custom acquirer.",
    "Go-live dependency.",
    "Webhook verify.",
    "OrderPaid.",
    "Payment success rates.",
    "PCI scope minimize.",
    "ARD-012.",
    "Multi-PSP.",
    "docs/decisions/ADR-0002")

add(85, "adr-ard-governance", "ADR and ARD Governance Completion Rules", "Accepted", [1],
    "Need executable governance for AI/human.",
    "Docs without process drift.",
    "ADRs in /adrs are architecture source of truth; ARDs are implementation packages; no code without covering ADR+ARD; status boards; dependency maps; ard-to-code executes ADR order first-class.",
    "Autonomous buildability.",
    "Ad-hoc coding.",
    "Process overhead.",
    "STATUS in adrs/STATUS.md; roadmap docs.",
    "All domains covered by ADR map.",
    "N/A",
    "N/A",
    "This ADR set + AGENT + skill.",
    "Add ADRs for new decisions only.",
    "adr-roadmap.md")

add(86, "storefront-architecture", "Storefront Architecture", "Accepted", [6, 16, 82],
    "Customer acquisition surface.",
    "Ambiguous multi-merchant pages.",
    "Dedicated per-store storefront at slug URL; catalog/PDP/info/map; pickup checkout entry; branding; no marketplace.",
    "Store ownership.",
    "Shared mall UX.",
    "N/A",
    "Public routes cache 600s.",
    "StorefrontVisited.",
    "Funnel events.",
    "Public rate limits.",
    "ARD-010.",
    "A/B banners later.",
    "storefront-pwa-architecture.md")

add(87, "customer-dashboard", "Customer Dashboard Architecture", "Accepted", [7, 10, 32, 23],
    "Visibility of loyalty value.",
    "Members can't self-serve history.",
    "Store-scoped customer portal: profile, points, history, rewards, receipts.",
    "Closes growth loops.",
    "WhatsApp statements only.",
    "More UI.",
    "Customer APIs authZ membership.",
    "Portal engagement analytics.",
    "WalletViewed.",
    "No cross-store leak.",
    "ARD-035.",
    "Push receipts later.",
    "")

add(88, "merchant-dashboard", "Merchant Dashboard Architecture", "Accepted", [63, 16, 21],
    "Daily home for merchants.",
    "No retention pulse.",
    "Merchant shell with overview widgets from OLTP analytics APIs; mobile-first; uiuxpromax.",
    "Activation retention.",
    "Desktop-only BI.",
    "N/A",
    "ARD-013.",
    "North Star visible.",
    "DashboardWidgetViewed.",
    "Auth merchant only.",
    "ARD-013/016.",
    "Custom reports.",
    "")

add(89, "admin-dashboard", "Admin Dashboard Architecture", "Accepted", [13, 62, 75],
    "Ops need portfolio + security views.",
    "SSH to DB.",
    "Admin UI: merchants, mgmt analytics, security signals, audit browser; platform_admin only.",
    "Operate SaaS.",
    "Metabase only.",
    "Build cost.",
    "ARD-018/025/026/022.",
    "N/A",
    "Admin usage analytics careful.",
    "Every view audited.",
    "uiuxpromax admin.",
    "SSO later.",
    "")

add(90, "notifications", "Notification Architecture", "Accepted", [36, 38],
    "Users need alerts (ready for pickup, low stock).",
    "Only email spam.",
    "In-app notifications persisted; realtime topic; SMS campaigns later via credits; don't block core TX.",
    "Engagement.",
    "SMS for everything.",
    "Channel overload.",
    "ARD-014.",
    "OrderReadyForPickup notify.",
    "Notification metrics.",
    "Opt-in future.",
    "ARD-014.",
    "Push web push.",
    "")

print("total ADRs", len(RAW))


def render(a: dict) -> str:
    n = a["n"]
    deps = a["deps"]
    dep_s = ", ".join(f"ADR-{d:03d}" for d in deps) if deps else "None"
    rel = ", ".join(f"ADR-{d:03d}" for d in deps) if deps else "—"
    return f"""# ADR-{n:03d} — {a['title']}

| Field | Value |
| --- | --- |
| ID | ADR-{n:03d} |
| Status | `{a['status']}` |
| Date | 2026-08-03 |

## Status

`{a['status']}` — Implementation tracking: see `adrs/STATUS.md`.

## Context

{a['context']}

## Problem Statement

{a['problem']}

## Decision

{a['decision']}

## Why This Decision / Rationale

{a['why']}

## Alternatives Considered

{a['alts']}

## Tradeoffs

{a['tradeoffs']}

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

{a['tech']}

## Domain Impact

{a['domain']}

## Analytics Impact

{a['analytics']}

## Security Impact

{a['security']}

## Implementation Requirements

{a['impl']}

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** {dep_s}

## Related ADRs

{rel}

## Related Documents

{a.get('related') or 'See docs/architecture and docs/tech as applicable.'}

## Migration Plan

- If greenfield: implement when this ADR is reached on the roadmap.
- If superseding prior practice: expand/contract; update ARDs; never silent break.

## Testing Requirements

- Acceptance criteria implied by Decision must be testable.
- Tenant isolation and authZ tests when data/auth touched.
- Performance budgets when POS/storefront touched.

## Operational Requirements

- Health/ready and runbooks updated if infra changes.
- Metrics/alerts for new failure modes.

## Security Considerations

{a['security']}

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

{a['future']}

## Completion Criteria

- [ ] Decision reflected in code and docs
- [ ] Dependent ADRs unblocked as needed
- [ ] Tests/validation for impacted areas green
- [ ] `adrs/STATUS.md` marked `completed`
"""


status_rows = []
for a in sorted(RAW, key=lambda x: x["n"]):
    fname = f"ADR-{a['n']:03d}-{a['slug']}.md"
    (ADRS_DIR / fname).write_text(render(a), encoding="utf-8")
    status_rows.append(f"| ADR-{a['n']:03d} | {a['title']} | {a['status'].lower()} | todo |")

(ADRS_DIR / "STATUS.md").write_text(
    f"""# ADR Implementation Status Board

| ID | Title | Decision status | Implementation |
| --- | --- | --- | --- |
"""
    + "\n".join(status_rows)
    + """

## Implementation values

- `todo` — not implemented in codebase
- `in_progress` — ard-to-code working this ADR
- `blocked` — waiting on proposed decision or dependency
- `completed` — implemented, validated, docs synced

Decision `Proposed` ADRs may be implemented behind ports/mocks until accepted.
""",
    encoding="utf-8",
)

(ADRS_DIR / "README.md").write_text(
    """# Architecture Decision Records (Canonical)

**Source of truth for architecture decisions:** this `/adrs` directory.

Legacy notes in `docs/decisions/` are superseded or mapped into this set (see ADR-083/084 for open vendor choices; ADR-042/056 incorporate former 0007/0008).

## How to use

1. Read `docs/architecture/adr-roadmap.md`
2. Read `docs/architecture/adr-dependency-map.md`
3. Execute via **ard-to-code** in roadmap order

## Index

See [STATUS.md](./STATUS.md) for full list and implementation progress.
""",
    encoding="utf-8",
)

print("wrote", len(RAW), "ADRs")
