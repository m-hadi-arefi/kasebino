# ADR-152: Catalog Cost and Tax Presentation Boundary

| Field | Value |
| --- | --- |
| ID | ADR-152 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #14 |
| Folder | `adrs/done/` |

## Status

Accepted — Completed on 2026-08-12.

## Context

Products had sell price only. Cost/tax were missing in MerchantOS catalog. ERPNext is financial brain — tax books should not be reinvented in MerchantOS — but merchants need operational cost fields for margin hints while maintaining margin secrecy on public storefronts.

## Current State

- Schema & DB: `products.cost_amount_minor` nullable bigint (migration `0009_catalog_product_cost.sql`).
- Domain: `Product` aggregate includes `cost: Money | null`.
- Repositories: `DrizzleProductRepository` and `InMemoryProductRepository` map `costAmountMinor`.
- Application Use Cases: `createProduct` and `updateProduct` validate and parse `costAmountMinor` (>= 0).
- HTTP API & DTOs: `productDto` includes `costAmountMinor` and `costDisplayToman` (formatTomanDisplay). `publicProductDto` strictly omits cost fields for secrecy.

## Decision

Implemented **MVP-A**:
1. Optional `costAmountMinor` added to `products` table for merchant margin hints (not GL accounting SoT).
2. Documented tax books as ERPNext-owned; no fake tax calculation on POS receipts.
3. Cost fields restricted to merchant management roles (`merchant.write`/`merchant.read`) and stripped from public storefront DTOs.

## Scope

Included:

- Optional cost field (`cost_amount_minor`) + migration
- Merchant product management API support
- Public storefront secrecy gate
- Unit and HTTP integration tests

Excluded:

- Full Iranian VAT engine in MerchantOS
- Tax lines on Sales Invoice projectors (ERPNext config / later ADR)
- COGS automation

## Acceptance Criteria Verified

- [x] Cost optional and persisted via API & DB
- [x] Margin secrecy: cost fields omitted from public storefront product payloads
- [x] Tax books declared owned by ERPNext
- [x] No fake tax on POS receipts
