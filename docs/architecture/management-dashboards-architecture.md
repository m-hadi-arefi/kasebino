# Management Dashboards Architecture

## Purpose

**Platform-level** and **leadership** reporting: portfolio health across merchants — not the in-merchant operational dashboard (ARD-013/016).

## Audiences

| Audience | Needs |
| --- | --- |
| Platform admin | Merchant growth, activation, abuse, system health |
| Leadership / ops | GMV proxies, DAM/MAM, retention rollups, SMS cost later |
| Support | Merchant status, recent audit highlights |

## Metric groups

1. **Acquisition & activation** — registrations, activation rate, time-to-first-sale  
2. **Engagement** — DAM/MAM, POS sessions, feature adoption  
3. **Commerce** — GMV-from-events (warehouse), online vs POS  
4. **Retention** — platform-level returning customer aggregates (derived; merchant North Star remains OLTP-authoritative per merchant)  
5. **Reliability** — error rates, OTP success, checkout p95 (from observability + warehouse)  
6. **Trust & safety** — suspensions, rate-limit spikes, suspicious auth  

## Data sources

| Metric class | Source of truth |
| --- | --- |
| Money / inventory truth | PostgreSQL |
| Usage / funnels / clickstream | MongoDB |
| Infra SLOs | OTel metrics / logs |

Rollups materialize into MongoDB `mos_mgmt` for fast admin UI; financial audit still reconciles to PostgreSQL. Foundations: ADR-062 (`src/mgmt-dashboard-analytics`) — platform_admin aggregates, DAM/MAM/GMV instrument notes, Persian labels; HTTP/uiuxpromax → ARD-025 / ADR-089.

## Refresh SLAs

| Tier | Freshness |
| --- | --- |
| Live ops strip | ≤ 1 minute (EMQX + light queries) |
| Standard mgmt widgets | ≤ 15 minutes |
| Daily executive | T+1 batch OK |

## UI constraints

- Admin-only routes; uiuxpromax  
- No marketing-landing clutter patterns  
- Export optional P1  

## Related

ARD-025 Management Dashboards, ARD-018 Admin Panel (embeds widgets).
