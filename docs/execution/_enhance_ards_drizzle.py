# -*- coding: utf-8 -*-
"""Append Persistence + Database Design sections to all ARDs; update AGENT/skills/templates."""
from pathlib import Path

ROOT = Path(r"C:\Users\Hadi\Desktop\projects\kasbino")
ARDS = ROOT / "docs" / "ards"


def write(path: Path, content: str) -> None:
    path.write_text(content.rstrip() + "\n", encoding="utf-8")
    print("wrote", path.relative_to(ROOT))


# Per-ARD database design snippets
DB = {
    "ARD-001": {
        "tables": "`outbox_events`, `processed_events`, `audit_logs`, `idempotency_keys` (baseline platform tables); Drizzle client + empty context schema modules",
        "rels": "Platform tables only; FKs deferred to domain ARDs",
        "constraints": "UUID PKs; created_at/updated_at on all; check published_at nullability patterns on outbox",
        "indexes": "outbox partial (published_at IS NULL); processed_events UNIQUE(event_id); idempotency UNIQUE(merchant_id, key) when merchant present",
        "queries": "ready probe SELECT 1; outbox poll stub",
        "load": "Negligible until sales; design for 50M events lifetime",
        "cache": "None business; Redis ping only",
        "migration": "Initial Drizzle Kit migration creating platform tables + extensions (pgcrypto/uuid, pg_trgm optional)",
        "repos": "OutboxRepository (iface + Drizzle impl stub), Health uses raw db execute via infra only",
        "tx": "N/A business UoW; establish transaction helper",
    },
    "ARD-002": {
        "tables": "`auth_users`, `otp_challenges`",
        "rels": "auth_users.id referenced later by merchant owner; no FK required yet",
        "constraints": "UNIQUE(phone) on auth_users; otp hashed; expires_at; attempts check",
        "indexes": "(phone); (phone, created_at DESC) on otp_challenges; expires_at for GC",
        "queries": "request OTP insert; verify latest challenge; upsert auth user by phone",
        "load": "Auth users ≈ merchants×staff; OTP rows high churn — retain short",
        "cache": "Rate limits in Redis; no user entity cache required",
        "migration": "Add identity schema module + Drizzle Kit migration",
        "repos": "AuthUserRepository, OtpChallengeRepository",
        "tx": "Verify OTP consume + optional user create in one TX",
    },
    "ARD-003": {
        "tables": "`merchants`, `merchant_settings`",
        "rels": "merchants.owner_user_id → auth_users.id",
        "constraints": "UNIQUE(slug); status check; settings keyed uniquely per merchant",
        "indexes": "UNIQUE(slug); (status); (owner_user_id)",
        "queries": "create merchant; get by id; get me; update profile; admin list later",
        "load": "50k merchants target; tiny vs sales",
        "cache": "`merchant:profile` TTL 300s; invalidate on update",
        "migration": "merchant schema + FKs",
        "repos": "MerchantRepository",
        "tx": "Register: user+merchant+outbox when combined with auth",
    },
    "ARD-004": {
        "tables": "`stores`",
        "rels": "stores.merchant_id → merchants.id",
        "constraints": "NOT NULL merchant_id,name; soft delete",
        "indexes": "(merchant_id); (merchant_id, created_at)",
        "queries": "CRUD stores; list by merchant",
        "load": "≤ few stores per merchant (multi-store future)",
        "cache": "store keys TTL 300s; storefront info 600s",
        "migration": "store schema",
        "repos": "StoreRepository",
        "tx": "Single aggregate writes",
    },
    "ARD-005": {
        "tables": "`categories`, `products`",
        "rels": "products.category_id → categories; both merchant-scoped",
        "constraints": "partial UNIQUE(merchant_id, barcode); partial UNIQUE(merchant_id, sku); price_amount >= 0",
        "indexes": "See indexing-strategy products section; trgm optional",
        "queries": "barcode resolve; search; list; CRUD",
        "load": "Hundreds–thousands products/merchant; grow with catalog",
        "cache": "product/barcode/list TTL 300s; storefront 600s",
        "migration": "catalog schema + indexes",
        "repos": "ProductRepository, CategoryRepository",
        "tx": "Product create/update single TX + outbox",
    },
    "ARD-006": {
        "tables": "`stock_items`",
        "rels": "UNIQUE(merchant_id, store_id, product_id); FK product/store",
        "constraints": "quantity >= 0 (MVP); version for optimistic lock",
        "indexes": "unique triple; partial low-stock",
        "queries": "get stock; adjust; decrement in sale",
        "load": "≈ products × stores",
        "cache": "stock keys TTL 300s",
        "migration": "inventory schema",
        "repos": "StockItemRepository",
        "tx": "Adjust in TX; sale decrement joined in POS TX",
    },
    "ARD-007": {
        "tables": "`sales`, `sale_lines`",
        "rels": "lines → sales; sales → store/customer/merchant",
        "constraints": "status checks; line qty > 0; idempotency unique; money >= 0",
        "indexes": "sales tenant+time; customer+time; status; lines(sale_id); product analytics",
        "queries": "CompleteSale UoW; receipt load; recent sales",
        "load": "Primary write path toward 50M+ transactions",
        "cache": "Invalidate analytics/stock/customer/wallet on complete",
        "migration": "sales schema + heavy indexes reviewed",
        "repos": "SaleRepository (+ ports to customer/stock/loyalty repos in UoW)",
        "tx": "**Critical:** single Drizzle transaction spanning sale, lines, stock, customer upsert, loyalty, outbox",
    },
    "ARD-008": {
        "tables": "`customers` (+ stats columns or side table)",
        "rels": "sales.customer_id → customers",
        "constraints": "partial UNIQUE(merchant_id, phone); soft delete",
        "indexes": "phone; last_purchase_at; total_spend; created_at",
        "queries": "upsert by phone; profile; list; purchase history join sales",
        "load": "5M+ customers envelope",
        "cache": "customer/phone/stats TTL 300s",
        "migration": "crm schema",
        "repos": "CustomerRepository",
        "tx": "Upsert during sale TX; profile updates standalone",
    },
    "ARD-009": {
        "tables": "`point_rules`, `wallets`, `points_ledger`, `coupons`",
        "rels": "wallet per customer; ledger → wallet/customer; coupons merchant-scoped",
        "constraints": "wallet balance >= 0; version on wallet; ledger immutable inserts",
        "indexes": "wallet unique(merchant_id,customer_id); ledger(customer,created_at); unique earn per sale_id",
        "queries": "earn/redeem; wallet get; expire job",
        "load": "ledger high write with sales",
        "cache": "wallet keys invalidate on points events",
        "migration": "loyalty schema",
        "repos": "WalletRepository, PointRuleRepository, CouponRepository",
        "tx": "Redeem/earn inside CompleteSale TX or immediate follow-up same TX",
    },
    "ARD-010": {
        "tables": "No new core tables; reads merchants/stores/products",
        "rels": "slug → merchant",
        "constraints": "N/A new",
        "indexes": "Ensure merchants.slug unique indexed",
        "queries": "storefront catalog/product/merchant info",
        "load": "Read-heavy; cache first",
        "cache": "sf:* TTL 600s",
        "migration": "None or covering index tweaks only",
        "repos": "StorefrontReadRepository (infra query service OK if not aggregate)",
        "tx": "Read-only",
    },
    "ARD-011": {
        "tables": "`orders`, `order_lines`",
        "rels": "lines → orders; merchant/store optional",
        "constraints": "status machine checks; idempotency unique; money >= 0",
        "indexes": "status+created_at; customer+created_at; payment_status+created_at",
        "queries": "create order; list open; transition status",
        "load": "Grows with online GMV; design like sales",
        "cache": "order list/detail invalidate on events",
        "migration": "ordering schema",
        "repos": "OrderRepository",
        "tx": "Create order+lines+outbox; status changes + outbox",
    },
    "ARD-012": {
        "tables": "`payments`",
        "rels": "payments.order_id → orders",
        "constraints": "status checks; provider_ref unique when present",
        "indexes": "(merchant_id, order_id); (provider_ref)",
        "queries": "create intent; webhook upsert; mark paid",
        "load": "≈ online orders",
        "cache": "Do not cache intents aggressively",
        "migration": "payments schema",
        "repos": "PaymentRepository",
        "tx": "Mark paid updates payment+order+outbox",
    },
    "ARD-013": {
        "tables": "Consumes `analytics_*` projections (may stub overview from sales if ARD-016 not done)",
        "rels": "N/A",
        "constraints": "N/A",
        "indexes": "Depend on projection PKs (merchant_id)",
        "queries": "GET overview",
        "load": "Read path; cache 60s",
        "cache": "analytics:overview",
        "migration": "None or thin projection stub",
        "repos": "AnalyticsQueryRepository (read)",
        "tx": "Read-only",
    },
    "ARD-014": {
        "tables": "`notifications`",
        "rels": "merchant_id + user_id",
        "constraints": "read_at nullability",
        "indexes": "(merchant_id, user_id, created_at DESC); unread partial",
        "queries": "list; mark read; insert from handlers",
        "load": "Moderate; retain/truncate policy later",
        "cache": "Optional short list TTL",
        "migration": "notifications schema",
        "repos": "NotificationRepository",
        "tx": "Insert notification + optional outbox",
    },
    "ARD-015": {
        "tables": "Uses `outbox_events`; no new business tables",
        "rels": "N/A",
        "constraints": "outbox delivery columns",
        "indexes": "Confirm outbox worker partial index",
        "queries": "poll outbox; mark published",
        "load": "Event volume ≈ writes",
        "cache": "N/A",
        "migration": "Possibly alter outbox for attempts/locked_at",
        "repos": "OutboxRepository",
        "tx": "Publish mark in small TX per batch",
    },
    "ARD-016": {
        "tables": "`analytics_daily_revenue`, `analytics_customer_stats`, `analytics_retention_stats` (names illustrative)",
        "rels": "PK merchant_id + day/period",
        "constraints": "non-negative metrics",
        "indexes": "PK/ unique (merchant_id, day)",
        "queries": "overview/revenue/customers/retention widgets",
        "load": "Rows ≈ merchants × days; not 50M sales scanned",
        "cache": "TTL 60s; invalidate on SaleCompleted/OrderPaid/CustomerReturned",
        "migration": "analytics projections schema",
        "repos": "AnalyticsProjectionRepository, AnalyticsQueryRepository",
        "tx": "Projection upserts per event handler (idempotent)",
    },
    "ARD-017": {
        "tables": "Server: reuse sales idempotency; optional `sale_sync_batches` audit",
        "rels": "N/A mandatory",
        "constraints": "Idempotency keys mandatory",
        "indexes": "idempotency unique already",
        "queries": "POST sync batch → CompleteSale path",
        "load": "Burst on reconnect",
        "cache": "Client IDB; server cache unchanged",
        "migration": "Optional sync audit table",
        "repos": "Reuse SaleRepository",
        "tx": "Each synced sale = full CompleteSale TX",
    },
    "ARD-018": {
        "tables": "`admin_actions` (audit) — merchants already exist",
        "rels": "actor admin user",
        "constraints": "action enum",
        "indexes": "(created_at DESC); (merchant_id, created_at)",
        "queries": "list merchants; activate/suspend",
        "load": "Admin low QPS",
        "cache": "Short TTL optional",
        "migration": "admin_actions table",
        "repos": "MerchantRepository + AdminActionRepository",
        "tx": "Status change + audit + outbox",
    },
    "ARD-019": {
        "tables": "No product tables; ops around existing DB",
        "rels": "N/A",
        "constraints": "N/A",
        "indexes": "Review pg_stat / missing indexes in staging",
        "queries": "Backup/restore validation queries",
        "load": "Ops",
        "cache": "N/A",
        "migration": "Migrate job in deploy pipeline (Drizzle Kit)",
        "repos": "N/A",
        "tx": "Migration windows documented",
    },
    "ARD-020": {
        "tables": "No new; hardening review of all",
        "rels": "Full graph review",
        "constraints": "Security/check review",
        "indexes": "EXPLAN on hot paths; add covering indexes if gaps",
        "queries": "Perf smoke barcode/checkout/north-star",
        "load": "Validate 50k merchant design assumptions",
        "cache": "TTL/hit-ratio verification",
        "migration": "Only perf/security DDL if needed",
        "repos": "Review all for tenant filters",
        "tx": "Chaos: TX rollback paths",
    },
}

PERSISTENCE_BLOCK = """
## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

{tables}

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: {migration}

### Repository Interfaces

{repos} — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

{tx}

### Caching Strategy

{cache}
"""

DB_DESIGN_BLOCK = """
## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

{tables}

### Relationships

{rels}

### Constraints

{constraints}

### Indexes

{indexes}

### Query Patterns

{queries}

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: {load}

### Caching Plan

{cache}

### Migration Plan

{migration}
"""

ACCEPT_EXTRA = """
- [ ] Drizzle migrations generated and reviewed
- [ ] Table design reviewed
- [ ] Query patterns reviewed
- [ ] Indexes + composite indexes reviewed
- [ ] Multi-tenancy (`merchant_id`) reviewed
- [ ] PostgreSQL performance considerations reviewed
- [ ] Drizzle schema reviewed against DB design (ORM follows DB)
- [ ] Cache strategy reviewed
- [ ] Repository interfaces + Drizzle implementations aligned
- [ ] Transaction boundaries implemented/documented
"""

VAL_EXTRA = """
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed
"""


def enhance_ard(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    # detect id
    ard_id = None
    for i in range(1, 21):
        key = f"ARD-{i:03d}"
        if key in text.split("\n", 5)[0] or f"| ID | {key} |" in text or f"| {key} |" in text[:500]:
            if f"ARD-{i:03d}" in path.name.upper() or f"| ID | {key} |" in text:
                ard_id = key
                break
    if not ard_id:
        # fallback from filename
        name = path.name.upper()
        for i in range(1, 21):
            if f"ARD-{i:03d}" in name.replace("_", "-"):
                ard_id = f"ARD-{i:03d}"
                break
    if not ard_id or ard_id not in DB:
        print("skip", path.name)
        return

    d = DB[ard_id]
    if "## Persistence Strategy" not in text:
        # insert before ## Testing or ## Acceptance
        block = PERSISTENCE_BLOCK.format(**d) + "\n" + DB_DESIGN_BLOCK.format(**d)
        if "## Testing" in text:
            text = text.replace("## Testing", block + "\n## Testing", 1)
        elif "## Acceptance Criteria" in text:
            text = text.replace("## Acceptance Criteria", block + "\n## Acceptance Criteria", 1)
        else:
            text = text.rstrip() + "\n" + block + "\n"

    if "Drizzle migrations generated and reviewed" not in text:
        text = text.replace(
            "## Acceptance Criteria\n",
            "## Acceptance Criteria\n" + ACCEPT_EXTRA + "\n",
            1,
        )
    if "drizzle-rules.md conformance" not in text:
        text = text.replace(
            "## Validation Checklist\n",
            "## Validation Checklist\n" + VAL_EXTRA + "\n",
            1,
        )

    # DoD note
    if "database design review" not in text.lower():
        text = text.replace(
            "## Definition of Done\n",
            "## Definition of Done\n\nNo ARD is complete without **database design review** and **Drizzle migration review** (see quality gate in `drizzle-rules.md`).\n",
            1,
        )

    write(path, text)


for p in sorted(ARDS.glob("ard-*.md")):
    enhance_ard(p)

# ARD template
w = write
template = (ROOT / "docs/templates/ard-template.md").read_text(encoding="utf-8")
if "## Persistence Strategy" not in template:
    template = template.replace(
        "## Testing",
        """## Persistence Strategy

**ORM:** Drizzle ORM

### Required Schema

### Required Migrations

### Repository Interfaces

### Repository Implementations

### Transaction Boundaries

### Caching Strategy

## Database Design

### Tables

### Relationships

### Constraints

### Indexes

### Query Patterns

### Estimated Load

### Caching Plan

### Migration Plan

## Testing""",
        1,
    )
    write(ROOT / "docs/templates/ard-template.md", template)

# implementation plan template
plan_t = (ROOT / "docs/templates/implementation-plan-template.md").read_text(encoding="utf-8")
if "Drizzle" not in plan_t:
    plan_t = plan_t.replace(
        "## Domain changes",
        """## Database design (first)

- Tables / indexes / queries
- Drizzle schema modules
- Migration plan

## Domain changes""",
        1,
    )
    write(ROOT / "docs/templates/implementation-plan-template.md", plan_t)

print("ARD enhance done")
