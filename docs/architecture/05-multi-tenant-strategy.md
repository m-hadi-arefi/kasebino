# 05 — Multi-Tenant Strategy

## Model

**Shared database, shared schema, row-level tenant discriminator.**

Tenant key = `merchantId` (UUID) for nearly all business tables.

Platform admin tables are global (no merchantId) and role-gated.

## Rules

1. Every tenant-owned table includes non-null `merchantId` (except pure join tables that inherit via parent).
2. Repositories ALWAYS filter by `merchantId` from auth context — never from untrusted client alone without match check.
3. Unique indexes are tenant-scoped (e.g. unique `(merchantId, phone)`, `(merchantId, barcode)`).
4. Cache keys include merchantId.
5. EMQX topics include merchantId.
6. Cross-tenant access is forbidden except platform admin with audited action.

## Auth context

JWT claims MUST include:

- `sub` (user id)
- `merchantId` (nullable for pre-merchant onboarding)
- `roles` (`merchant_owner`, `store_employee`, `customer`, `platform_admin` — see ADR-034 / `src/rbac`)
- `tokenVersion` for rotation/revocation strategy

## Isolation testing

Mandatory tests:

- Cannot read/update another merchant's product/customer/sale by ID alone
- Storefront public routes only expose public fields for slug-mapped merchant

## Future

Schema per tenant or DB per tenant is out of scope. Extraction notes in doc 20.
