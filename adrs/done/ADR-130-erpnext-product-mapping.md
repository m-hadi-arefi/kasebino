# ADR-130 - ERPNext Product Mapping

| Field | Value |
| --- | --- |
| ID | ADR-130 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext architecture research |
| Folder | `adrs/done/` - architecture contract (docs) landed 2026-08-09 |

## Status

`Accepted` - Architecture contract.

## Title

ERPNext Product Mapping - MerchantOS Product to ERPNext Item

## Context

MOS `Product` is a commerce entity (SKU, barcode, categories, selling UX). ERPNext `Item` is a master for stock/selling/buying/accounting defaults.

## Problem Statement

Naively sharing one model or storing `erp_item_id` on `products` couples catalog to a vendor.

## Goals

Define field mapping and SoT rules for product sync.

## Non Goals

Live Item upsert; full variant/BOM/manufacturing mapping.

## Decision

### Mapping

| MerchantOS | ERPNext |
| --- | --- |
| Product.id | Mapping `entity_type=product` -> Item `name` |
| SKU | Item Code (or custom field if series conflicts) |
| Barcode | Item Barcode child table |
| Name / description (presentation) | Item Name / Description |
| Category (UX) | Item Group (projection; may flatten) |
| `base_unit_code` / UOM | Default UOM (+ conversion table later) |
| POS price (`priceAmountMinor`) | Item Price / Standard Selling Rate projection |
| Sellable flag | Disabled / sales-item style flags |

### Rules

1. **MOS Product is catalog SoT.** ERP Item is a projection.
2. Identity via `external_entity_mappings` only.
3. Price conflicts -> MOS wins retail; ERP rate updated to match when syncing.
4. Service vs stock: MOS products that do not decrement stock map to Items with Maintain Stock unset.
5. Do not sync loyalty-only virtual SKUs unless needed for invoicing.

### Sync triggers

`ProductCreated` / `ProductUpdated` -> `AccountingProvider.syncProduct`.

## Rationale

Keeps Iranian catalog UX free while giving accountants income/stock accounts on Items.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| ERP Item as SoT | Slows storefront iteration; Desk UX |
| Column `erpnext_item_id` on products | Vendor lock-in |

## Consequences

ACL must handle Item Group bootstrap and UOM creation carefully.

## Implementation Requirements

- [x] Document in knowledge base + this ADR
- [ ] Adapter mapping code (deferred)

## Dependencies

ADR-008, ADR-126, ADR-128, ADR-129

## Related Documents

`erpnext-selling.md`, `erpnext-data-model.md`

## Migration Plan

Empty mappings until adapter; no backfill required now.

## Testing Requirements

Mapper unit tests when adapter lands; Fake syncProduct today.

## Iranian User Experience Requirements

Persian product names must round-trip as UTF-8; no Latin-only requirement in ERP.

## Completion Criteria

- [x] Mapping table accepted
