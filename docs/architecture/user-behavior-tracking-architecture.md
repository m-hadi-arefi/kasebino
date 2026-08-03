# User Behavior Tracking Architecture

## Purpose

Capture **clickstream**, **sessions**, and interaction paths across merchant app, storefront, and admin to power UX insights and funnels.

## Clickstream

- `PageViewed`, `ElementClicked`, optional `ScrollDepth` (sampled)  
- Include `path`, `referrer`, `source`, viewport class (mobile/desktop)  
- Batch client beacons (e.g. every N seconds or on unload) to reduce load  

## Session analytics

| Field | Notes |
| --- | --- |
| sessionId | Client-generated UUID |
| startedAt / endedAt | Heartbeat extends TTL |
| duration | Derived |
| entryPath / exitPath | |
| eventCount | |
| deviceClass | mobile / desktop / tablet / unknown |

Session timeout default: 30 minutes idle (configurable).

Storage: MongoDB `mos_sessions` aggregates (`src/session-analytics/`, ADR-061). Clickstream path events remain `mos_behavior`.

Timestamps store UTC ISO-8601; merchant-facing session KPIs use Jalali / `Asia/Tehran`.

## Identity stitch

Anonymous storefront sessions may later attach `customerPhoneHash` or order id after purchase — store as link event `IdentityMerged`, do not rewrite history.

## Sampling

- Full fidelity for POS critical UX events  
- Storefront high traffic may sample noisy events (e.g. 10–100% by env) while keeping conversion funnel events at 100%  

## AuthZ & tenancy

- Merchant behavior events tagged with `merchantId`  
- Storefront events tagged with merchant slug→id resolution server-side  

## Storage

MongoDB `mos_behavior` time-series recommended for clickstream path events. Indexes: sessionId, merchantId+occurredAt, eventType+occurredAt. Session aggregates → `mos_sessions` (ADR-061).

## Related

ARD-027; [product-analytics-architecture.md](./product-analytics-architecture.md).
