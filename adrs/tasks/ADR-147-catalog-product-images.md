# ADR-147: Catalog Product Images Runtime

| Field | Value |
| --- | --- |
| ID | ADR-147 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #11 |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

Catalog CRUD is production-wired (SKU, barcode, price, categories) but products have **no images** — storefront PDP and POS visual recognition suffer. MinIO already used for branding/receipts.

## Current State

- Schema `products`: no image columns (`schema/catalog.ts`)
- Domain `Product`: no image fields
- UI: `product-form.tsx` without upload
- Object storage: `create-minio-runtime.ts`, store assets pattern in `upload-branding-asset.ts`

## Decision

Add primary product image (and optional gallery later) stored in MinIO with object keys on `products`; upload via authenticated merchant API; serve via signed URL or public product-image route consistent with storefront logo pattern.

## Scope

Included:

- `imageObjectKey` (and optional `imageAltFa`) on products
- Upload/replace/delete APIs
- Merchant product form uploader
- Storefront + POS thumbnail display

Excluded:

- Variants with per-SKU images
- CDN outside MinIO
- AI image generation
- Video

## Technical Design

### Database

- `products.image_object_key` nullable text
- Optional `products.image_updated_at`

### Backend

- Reuse object storage port; keys: `merchants/{merchantId}/products/{productId}/primary`
- Validate content-type image/* and size cap
- Soft-delete product should retain or GC object — document GC as best-effort async later

### Frontend

- uiuxpromax brief for upload control RTL
- Storefront catalog cards show image or Persian placeholder

### Security

- Authz `catalog.manage`; never expose MinIO credentials to browser — upload via MOS API or short-lived presign

## Implementation Plan

1. Schema migration via drizzle-kit.
2. UC + handlers.
3. UI form + storefront/POS read.
4. Tests.

## Data Model Changes

Tables: `products` alter  
Fields: `image_object_key`  
Indexes: none required  
Relations: object key logical to MinIO

## API Changes

Routes:

- `POST /api/v1/catalog/products/{id}/image`
- `DELETE /api/v1/catalog/products/{id}/image`
- Product GET includes image URL field resolved server-side

## Frontend Changes

Pages: products new/edit, storefront catalog/PDP, POS search results  
Components: image uploader  
User flows: upload → appears on storefront

## Testing Requirements

Unit: key builder, size validation  
Integration: MinIO memory or testcontainer  
E2E: optional

## Acceptance Criteria

- [ ] Merchant can upload JPEG/WebP/PNG under size limit
- [ ] Storefront shows image
- [ ] Delete clears key and best-effort object
- [ ] Unauthorized upload rejected
- [ ] Persian empty-state when missing

## Dependencies

Required before: MinIO runtime (ADR-111 done), catalog APIs  
Depends on: none

## Migration / Rollout Plan

Additive nullable column — zero downtime.
