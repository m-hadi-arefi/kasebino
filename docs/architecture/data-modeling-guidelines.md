# Data Modeling Guidelines

Senior-DBA standards for MerchantOS relational design. **ORM follows the model; the model does not follow the ORM.**

## Entity checklist (every table)

For each entity document in the owning ARD:

| Item | Required |
| --- | --- |
| Table purpose | Yes |
| Expected growth rate | Yes |
| Row estimates @ 10 / 500 / 5k / 50k merchants | Yes |
| Read patterns | Yes |
| Write patterns | Yes |
| Hot paths / cold paths | Yes |
| PK strategy | UUID |
| FK strategy | Explicit, indexed |
| Unique constraints | Tenant-scoped |
| Check constraints | Money ≥ 0, qty rules, status enums |
| Soft delete | When applicable |
| Audit fields | created_at, updated_at; audit_logs for sensitive |
| Optimistic locking (`version`) | Concurrent writers |

## Naming

- Tables: `snake_case` plural (`sale_lines`)
- Columns: `snake_case`
- Booleans: `is_active`, `is_…`
- Timestamps: `*_at` as `timestamptz`
- Money: `amount` + `currency` (or `numeric` + currency check); store minor units integer when possible for IRR

## Primary keys

- UUID v4 or v7; prefer time-sortable UUIDs if generated in app for index locality
- No serial ints for public/tenant resources (enumeration risk, merge difficulty)

## Foreign keys

- Declare FKs in DB for integrity on core graphs (sale→merchant, line→sale, stock→product)
- Index FK columns
- ON DELETE: prefer restrict + soft delete over cascading hard deletes
- Cross-context references may be UUID without FK only when extraction/bounded-context purity demands — document in ADR

## Uniques

Always include `merchant_id` in business uniques:

- `(merchant_id, phone)` customers  
- `(merchant_id, barcode)` products  
- `(merchant_id, slug)` merchants global slug may be global unique without merchant_id  

Use **partial unique indexes** with `WHERE deleted_at IS NULL` when soft delete would otherwise block re-insert.

## Checks

Examples:

- `price_amount >= 0`
- `quantity >= 0` on stock (MVP)
- `status IN (...)`
- `points >= 0` on wallet balance

## Soft delete

- `deleted_at timestamptz NULL`
- Default repository reads: `isNull(deletedAt)`
- Unique constraints must account for soft delete (partial indexes)

## Auditability

- Row timestamps always
- `audit_logs`: actor_id, action, entity_type, entity_id, merchant_id, payload summary, ip, correlation_id, created_at
- Sensitive: auth privilege changes, suspend merchant, stock adjust, refund/cancel sale, wallet redeem

## Optimistic locking

- `version INT NOT NULL DEFAULT 1`
- Update: `WHERE id = $1 AND version = $2` then `version = version + 1`
- Required candidates: `stock_items`, `wallets`, offline sale sync targets

## Multi-tenancy review questions

1. Can a query omit `merchant_id` and still return rows? → **Fail**  
2. Can two merchants collide on natural keys? → Fix unique  
3. Can storefront expose another merchant’s cost fields? → DTO ACL  
4. Are admin global tables clearly separated?  

## Normalization vs performance

- 3NF default for OLTP aggregates  
- Controlled denormalization: `merchant_id` on child lines; cached `total_spend` on customers updated by events  
- Do not denormalize blindly into JSON blobs for core sales

## Drizzle encoding rules

- One schema file per bounded context  
- Explicit `uniqueIndex` / `index` / `primaryKey` in table definition  
- Relations declared for join clarity; queries still explicit  
- Never invent columns in schema that are missing from ARD Database Design  

## Anti-patterns

- Global mutable “god” settings JSON without versioning  
- Polymorphic FK without discriminator discipline  
- Soft delete without partial uniques  
- Using ORM migrations to skip design review  
- Alternative ORMs  

## Related

- [database-architecture.md](./database-architecture.md)
- [indexing-strategy.md](./indexing-strategy.md)
- [query-strategy.md](./query-strategy.md)
- [../rules/drizzle-rules.md](../rules/drizzle-rules.md)
