# MinIO

## Purpose

S3-compatible object storage for receipts/images/QR assets.

## Why chosen

Local parity with S3; cheap self-host.

## Best practices

- Presigned URLs
- Store keys in DB
- Bucket separation

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging
- Implementation package: `src/minio-storage/` (ADR-040) — `ObjectStoragePort` + in-memory adapter; thin env stub `src/infrastructure/minio/client.ts`
- Env keys: `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (compose local parity)
- Persian (fa) filenames: UTF-8 metadata via `encodeFilenameMetadata` / `decodeFilenameMetadata` (base64url)

## Folder conventions

- Contract + port: `src/minio-storage/`
- Thin client stub: `src/infrastructure/minio/`
- Legacy convention note: `src/shared/infrastructure/storage` (optional later colocated adapters)

## Anti-patterns

- Serving bucket publicly without review
- Storing secrets in object metadata
- Storing receipt/media/QR binaries as PostgreSQL BLOBs

## Performance recommendations

- Image size limits (enforced in `OBJECT_LIMITS`)
- CDN caching headers (future)

## Security recommendations

- Validate content-type/size
- Private buckets default

## Example architecture usage

Receipt PDF upload after SaleCompleted → `ReceiptRef` + MinIO `receipts` bucket.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
