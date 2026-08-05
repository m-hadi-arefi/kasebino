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
- Contract: `src/minio-storage/` (ADR-040) — `ObjectStoragePort` + in-memory (tests)
- Live adapter: `src/infrastructure/minio/` (ADR-111) — AWS SDK v3 S3 client + path-style MinIO
- Runtime: `createMinioRuntime` / `MOS_MINIO_MODE=memory|live` (default live when `MINIO_ENDPOINT` set)
- Env keys: `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (compose local parity)
- Persian (fa) filenames: UTF-8 metadata via `encodeFilenameMetadata` / `decodeFilenameMetadata` (base64url)

## Bucket bootstrap (Compose / prod)

MVP private buckets (created on runtime `ready`):

| Bucket | Use |
| --- | --- |
| `receipts` | Sale HTML/PDF snapshots |
| `media` | Store logos/icons (no SVG) |
| `qr` | Store QR PNG assets |

Local:

```bash
docker compose up -d minio
# App/worker call ensureBucket for receipts|media|qr on startup
```

Console: `MINIO_CONSOLE_URL` (default http://localhost:9001) — root user/password from env.

Production: create the three buckets privately; never public-read without review. Prefer IAM-style access keys via `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` aliases.

## Folder conventions

- Contract + port: `src/minio-storage/`
- Live client + adapter + runtime: `src/infrastructure/minio/`
- Legacy convention note: `src/shared/infrastructure/storage` (optional later colocated adapters)

## Anti-patterns

- Serving bucket publicly without review
- Storing secrets in object metadata
- Storing receipt/media/QR binaries as PostgreSQL BLOBs
- Using in-memory adapter outside tests

## Performance recommendations

- Image size limits (enforced in `OBJECT_LIMITS`)
- Prefer HTML receipt snapshot over sync PDF (ADR-111)
- CDN caching headers (future)

## Security recommendations

- Validate content-type/size
- Private buckets default
- AuthZ before issuing signed download URLs
- No SVG for storefront logos (XSS)

## Example architecture usage

SaleCompleted → HTML receipt → MinIO `receipts` → `sales.receipt_object_key` → signed GET `/api/v1/sales/{id}/receipt`.

Store logo upload → `media` bucket → `stores.logo_object_key` → public proxy `/api/v1/storefront/{slug}/logo`.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
