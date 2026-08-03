# Query Strategy

**Query-first database design.** Tables and indexes are derived from expected access paths, not from entity diagrams alone.

## Design process (mandatory for each ARD)

1. List queries this ARD introduces or depends on  
2. Classify: OLTP hot / dashboard / analytical / admin  
3. Choose access method (PK, unique, composite, cache)  
4. Design/adjust tables & indexes  
5. Encode in Drizzle schema + migration  
6. Add Redis cache plan for expensive reads  

## Performance budgets (bind queries)

| Path | Budget |
| --- | --- |
| Barcode → product | ≤ 1s (target p95 ≪ 100ms with index+cache) |
| Product search | ≤ 100ms p95 cached/local |
| Phone → customer | POS-critical; indexed equality |
| CompleteSale TX | Contributes to < 5s checkout |
| Dashboard widgets | Cache TTL 60s; projection read |

## Query categories (MVP top set)

### POS (hottest)

1. Resolve product by `(merchant_id, barcode)`  
2. Search products by name/sku prefix/fuzzy within merchant  
3. Get product by id (tenant-scoped)  
4. Upsert/find customer by `(merchant_id, phone)`  
5. Read wallet by `(merchant_id, customer_id)`  
6. Lock/read stock `(merchant_id, store_id, product_id)` for update  
7. Insert `sales` + `sale_lines` in one TX  
8. Decrement stock rows in same TX  
9. Insert ledger earn/redeem  
10. Insert outbox events  
11. Load sale + lines for receipt  
12. Idempotency lookup by key  

### CRM

13. List customers by merchant paginated  
14. Filter by segment  
15. Customer purchase history `(merchant_id, customer_id, created_at)`  
16. Soft-deleted exclusion default  

### Catalog / inventory

17. List products active  
18. Category product lists  
19. Adjust stock  
20. Low stock query  

### Storefront

21. Resolve merchant by slug  
22. Public catalog page  
23. Product detail public  
24. Create order + lines (idempotent)  

### Orders / payments

25. Merchant open orders by status  
26. Mark paid/canceled/delivered  
27. Payment intent by order  

### Analytics (via projections preferred)

28. Overview KPIs  
29. Revenue by day/range  
30. Customer counts / new  
31. Monthly returning customers (North Star)  
32–40. Widget variants / range params  

### Auth / platform

41. Create OTP challenge  
42. Verify latest OTP  
43. Auth user by phone  
44. Audit log insert  
45. Outbox poll unpublished  
46. Rate limit is Redis — not SQL  

### Admin

47. List merchants  
48. Activate/suspend merchant  

*(Extend toward ~100 concrete queries as modules land; each new ARD adds numbered queries to its Database Design section.)*

## Pagination

| Use case | Strategy |
| --- | --- |
| POS recent sales, CRM lists, orders board | **Keyset**: `(created_at, id) < (:cursor_ts, :cursor_id)` |
| Admin small pages | Offset acceptable |
| Never | `OFFSET` deep pages on 50M row tables |

## Filtering rules

Every tenant query:

```sql
WHERE merchant_id = $1
  AND deleted_at IS NULL  -- when soft delete applies
  AND /* business predicates */
```

Never accept `merchant_id` solely from client without matching JWT claim.

## Aggregations

- Do **not** `SUM(sales)` across unbounded history on request path for dashboards  
- Maintain `analytics_*` projection tables or incremental counters updated from `SaleCompleted` / `OrderPaid`  
- Short Redis TTL (60s) in front of projections  

## Transactions

| Use case | Boundary |
| --- | --- |
| CompleteSale | Single TX: sale, lines, stock, customer upsert, loyalty, outbox |
| Order create | TX: order, lines, outbox |
| OTP verify + optional merchant create | TX spanning identity (+ merchant if same UoW) |

Use Drizzle `db.transaction(async (tx) => { ... })`. Pass `tx` into repositories.

## Bulk operations

- Product import: batched inserts (e.g. 100–500 rows), one transaction per batch  
- Avoid N+1: `inArray(product.id, ids)` for cart hydration  

## Caching interaction

```
Query → Redis key? → return
      → miss → Drizzle query (indexed) → set Redis TTL → return
```

Invalidate via domain events (see cache-strategy.md). Prefer Redis before PostgreSQL for repeated entity reads.

## N+1 prevention

Forbidden pattern: load sales then per-line product query in loop.  
Required: join or batch load products once.

## Explain plans

For new hot-path queries in staging: `EXPLAIN (ANALYZE, BUFFERS)` once before ARD Done. Document index used in progress-log if non-obvious.

## Related

- [indexing-strategy.md](./indexing-strategy.md)
- [database-architecture.md](./database-architecture.md)
- [../tech/drizzle-orm.md](../tech/drizzle-orm.md)
