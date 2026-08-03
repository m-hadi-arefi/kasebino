# Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| A1 | Phone number is acceptable primary customer identity for Phase 1 merchants | Assumed |
| A2 | Merchants will accept mandatory phone capture if checkout stays under 5s | Assumed |
| A3 | JWT + OTP (no password) is sufficient for merchant auth MVP | Assumed |
| A4 | Modular monolith is sufficient until extraction triggers are met | Assumed |
| A5 | Redis cache-aside + event invalidation is enough for MVP consistency | Assumed |
| A6 | EMQX MQTT is available in all environments including local Docker | Assumed |
| A7 | MinIO S3-compatible API is adequate for receipts/media | Assumed |
| A8 | Multi-store is **in MVP** (full multi-store: inventory/branding/membership per store) | Decided (ADR-091) |
| A9 | Loyalty default 100,000 IRR = 1 point is acceptable starting rule | Assumed |
| A10 | PWA offline (sale queue) can be P1 if online POS meets P0 | Assumed |
| A11 | Loyalty expiry default = 12 months from last earn; merchant-configurable | Decided (ADR-091) |
| A12 | Phase-1 Kerman = free merchant pilot (no enforced SaaS/tx fee) | Decided (ADR-091) |
| A13 | Storefront URL = path `/s/{storeSlug}` | Decided (ADR-091) |

Assumptions that fail must produce a decision record and possible ARD updates — not silent code changes.
