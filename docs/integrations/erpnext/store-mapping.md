# Store / Company Mapping (Intent)

## Reality today

MerchantOS is multi-merchant / multi-store. ERPNext typically models:

- **Company** — legal / books entity
- **Warehouse** — stock location
- **Cost Center** — optional P&L slicing

MerchantOS must **not** add ERPNext columns to `merchants` / `stores`. Use `external_entity_mappings`.

## Intended mapping

| MerchantOS | ERPNext (future) | Mapping entity_type | Notes |
| --- | --- | --- | --- |
| `Merchant` | Company | `merchant` | Default 1:1 for single-company merchants |
| `Store` | Warehouse | `store_warehouse` | Per-store stock location |
| `Store` | Cost Center (optional) | `store_cost_center` | If merchant wants per-store P&L |
| Same merchant, multi-store | One Company, many Warehouses | — | Preferred Iranian multi-branch shape |

Secondary external ids may use `external_secondary_id` when one MOS entity maps to two ERP concepts (rare); prefer separate mapping rows per `entity_type`.

## Rules

1. Identity is UUID (`merchant.id`, `store.id`) — never shop display name.
2. Provider column stays vendor-neutral (`erpnext` only when the future adapter exists; tests use `fake`).
3. Mapping rows are created/updated by the accounting integration worker after successful upsert — not by POS UI.
4. Missing mapping → worker syncs/creates remote entity then writes mapping (future adapter behavior).

## Example rows (conceptual)

```text
merchant_id=M1 provider=erpnext entity_type=merchant entity_id=M1 external_id=COMP-0001
merchant_id=M1 provider=erpnext entity_type=store_warehouse entity_id=S1 external_id=WH-STORE-01
```
