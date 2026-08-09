# ERPNext Buying

> Procurement concepts. MerchantOS deliberately stays thin here in Phase 1.

## Purpose

Manage suppliers, RFQs, purchase orders, receipts, purchase invoices, and replenishment.

## Main concepts

| Concept | Role |
| --- | --- |
| **Supplier** | Purchase party (AP) |
| **Request for Quotation** | Competitive sourcing |
| **Supplier Quotation** | Received offers |
| **Material Request** | Internal indent / reorder signal |
| **Purchase Order** | Commitment to buy |
| **Purchase Receipt** | Goods in → stock |
| **Purchase Invoice** | Supplier bill → AP + expense/asset |
| **Landed Cost Voucher** | Allocate freight/duties into valuation |

## Lifecycle (typical)

```text
Material Request → RFQ/Quotation → Purchase Order → Purchase Receipt → Purchase Invoice → Payment Entry
```

Shorter paths exist (direct PI) depending on Buying Settings.

## MerchantOS usage

**ERPNext owns purchase / supplier books** until a dedicated MerchantOS purchasing UX ADR exists.

| Capability | Owner | Sync |
| --- | --- | --- |
| Supplier master & AP | ERPNext | E (optional E→M later) |
| Purchase orders / receipts | ERPNext | E |
| Restock → MOS availability | Future | E→M stock receipt notifications |
| Catalog stub `PurchaseCompleted` | Event name only | Not implemented in MOS domain |

### Why ERPNext-first for purchase

1. Mature domain (RFQ, landed cost, AP, tax).
2. PRD non-goals exclude supplier networks and ERP purchasing from MVP.
3. Avoid dual SoT for inventory receipts before reconciliation machinery exists.

### Future reverse sync (not now)

When merchants need MOS shelf availability from ERP purchases:

ERP Purchase Receipt submit → webhook/poll → ACL → MOS `stock_movements` + `stock_items` upsert — **only** through integration layer.

## Related docs

- [domain-ownership.md](./domain-ownership.md)
- [roadmap.md](./roadmap.md)
