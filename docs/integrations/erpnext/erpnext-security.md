# ERPNext Security Rules (MerchantOS)

## Credentials — absolute rules

ERPNext API keys / secrets / OAuth client secrets are **server-side only**.

| Surface | Credentials allowed? |
| --- | --- |
| Outbox / integration worker | Yes (future) |
| API route handlers (server) | Only via composition-root provider — never echo to client |
| Browser | **Never** |
| Merchant staff POS PWA | **Never** |
| Customer store PWA | **Never** |
| Next.js `NEXT_PUBLIC_*` | **Never** |
| Mobile offline queue payload | **Never** |

Offline POS path remains: browser queue → MerchantOS API → PostgreSQL/outbox → worker → AccountingProvider.

## Future env shape (placeholders only today)

ADR-126 ships `MOS_ACCOUNTING_PROVIDER=noop|fake`. Future ERPNext secrets must follow `docs` / ADR-068 patterns, for example:

- `MOS_ACCOUNTING_PROVIDER=erpnext`
- `MOS_ERPNEXT_BASE_URL`
- `MOS_ERPNEXT_API_KEY`
- `MOS_ERPNEXT_API_SECRET`

No real secrets in repo, `.env.example` values must be empty placeholders.

## Least privilege in ERPNext

Create a dedicated Frappe **User** for MerchantOS:

- Roles limited to required DocTypes (Item, Customer, Sales Invoice, Payment Entry, Warehouse read, etc.)
- No System Manager unless temporarily needed for setup
- Prefer token auth over storing Administrator password
- Rotate secrets; scrub from logs

## Logging & PII

- Never log API secrets or Authorization headers.
- Minimize customer phone / national id in integration logs.
- Prefer merchantId / storeId / saleId / eventId for correlation.
- Integration metrics already defined in [event-contracts.md](./event-contracts.md).

## Tenancy

MOS is multi-merchant. Each merchant’s ERP company/credentials strategy must be decided in a future tenancy ADR (shared ERP site with Companies vs per-merchant site). Until then:

- Mapping rows are always `merchant_id`-scoped.
- Never cross-read another merchant’s external ids.

## Network

- TLS to ERPNext required in production.
- Restrict ERP Desk exposure; workers use private network where possible.
- Webhooks (future) must verify signatures / shared secrets.

## Forbidden coupling

1. No ERPNext SDK in `src/modules/*/domain` or application use cases.
2. Adapters only under accounting infrastructure ACL (e.g. `infrastructure/providers/erpnext/`).
3. No ERP cookies in MOS session JWT.
4. Analytics Mongo is not an authorization or accounting authority.
