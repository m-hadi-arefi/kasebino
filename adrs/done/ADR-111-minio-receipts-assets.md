# ADR-111 - MinIO Receipts and Asset Storage Runtime

| Field | Value |
| --- | --- |
| ID | ADR-111 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

MinIO Receipts and Asset Storage Runtime

## Context

MinIO Compose service + object storage port + in-memory adapter exist; no S3/MinIO SDK; receipts/assets not stored.

## Problem Statement

POS receipts and store branding assets (logos/PWA icons/QR PNGs) cannot be durably stored or served.

## Goals

- Live MinIO (S3 API) adapter.
- Store receipt objects on sale complete; signed download for merchant/customer.
- Store logos/icons for branding and PWA manifests.

## Non Goals

- CDN multi-region in MVP.
- Arbitrary file sharing product.

## Functional Requirements

- FR-1: Upload/get/delete via `ObjectStoragePort` with MinIO SDK.
- FR-2: Receipt PDF or HTML snapshot stored; `ReceiptRef` on sale.
- FR-3: Branding asset upload for store logo/icons.
- FR-4: Bucket bootstrap documented for Compose/prod.

## Technical Design

1. Add AWS S3-compatible client configured for MinIO env.
2. Replace in-memory adapter in composition for non-test envs.
3. Generate receipt after CompleteSale; async via outbox OK if UX shows receipt id immediately.
4. Signed URLs with short TTL for portal/POS.

## Database Changes

- Store object keys/refs on sales/stores (columns if missing → migrate).

## Backend Changes

- MinIO adapter; receipt generator; asset upload use cases/APIs.

## Frontend Changes

- POS receipt view/download; onboarding/branding image upload; customer receipt list.

## Admin Changes

- None required.

## API Changes

- `/api/v1/stores/{id}/assets`
- `/api/v1/sales/{id}/receipt` (signed URL)

## Security Considerations

- Private buckets; signed URLs; authZ before issue.
- Validate content-type/size; no SVG script risks for logos if served inline.

## Edge Cases

- MinIO down at sale time - keep sale success; retry receipt render via outbox.
- Expired signed URL refresh path.

## Acceptance Criteria

- [ ] Sale produces stored receipt object retrievable via signed URL.
- [ ] Store logo upload appears on storefront branding.
- [ ] In-memory adapter remains test-only.

## Rollout Plan

Compose bucket init → wire sale receipt → branding uploads.

## Dependencies

- ADR-040, ADR-093, ADR-096, ADR-100, ADR-103, ADR-104, ADR-105, ADR-121

## Risks

- Large PDF generation latency on request path - prefer async.

## Related Documents

- ADR-040
- `PRD.md` POS-07 receipts

## Iranian User Experience Requirements

- Receipt content Persian RTL; تومان; Jalali datetime.

## Estimated Complexity

**M**
