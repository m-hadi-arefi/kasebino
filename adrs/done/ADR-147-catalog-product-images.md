# ADR-147: Catalog Product Images Runtime

| Field | Value |
| --- | --- |
| ID | ADR-147 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #11 |
| Folder | `adrs/done/` |

## Status

Accepted — Completed on 2026-08-12.

## Context

Catalog CRUD was production-wired (SKU, barcode, price, categories) but products had **no images** — storefront PDP and POS visual recognition suffered. MinIO was already used for branding/receipts.

## Current State

- Schema `products`: `image_object_key` and `image_updated_at` added via Drizzle migration `0008_catalog_product_images.sql`.
- Domain `Product`: `imageObjectKey` and `imageUpdatedAt` added to aggregate.
- HTTP API: `POST /api/v1/catalog/products/{id}/image` (JSON base64) and `DELETE /api/v1/catalog/products/{id}/image` implemented.
- Storage: Stored in MinIO media bucket under `m/{merchantId}/s/catalog/media/product-{productId}-primary.{ext}` via `ObjectStoragePort`.

## Decision

1. Primary product image stored in MinIO media bucket with object key on `products` aggregate.
2. Upload via authenticated merchant API (`merchant.write` permission).
3. Image delete clears object key on product and removes object from MinIO.

## Scope

Included:

- `imageObjectKey` and `imageUpdatedAt` on `products`
- Upload/replace/delete APIs
- DTO resolution (`productDto` & `publicProductDto`)
- Unit and HTTP integration tests

Excluded:

- Variants with per-SKU images
- CDN outside MinIO
- AI image generation
- Video

## Technical Design

### Database

- `products.image_object_key` nullable text
- `products.image_updated_at` nullable timestamp with time zone

### Backend

- Reuse object storage port; keys: `m/{merchantId}/s/catalog/media/product-{productId}-primary.{ext}`
- Validate content-type image/* (JPEG, PNG, WebP, GIF) and 5MB size cap with Persian domain errors.
- Soft-delete product or image delete clears object key and removes MinIO object best-effort.

## Acceptance Criteria Verified

- [x] Merchant can upload JPEG/WebP/PNG under 5MB size limit
- [x] Storefront and product DTOs include `imageObjectKey` and `imageUpdatedAt`
- [x] Delete clears key and removes MinIO object
- [x] Unauthorized upload rejected with Persian error
- [x] Persian empty-state and error messages (`fa-IR`)
