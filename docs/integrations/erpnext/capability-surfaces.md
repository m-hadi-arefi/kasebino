# Merchant-facing ERPNext capabilities (ADR-141)

Phases **1–4** (this pass):

| Capability | Surface |
| --- | --- |
| Foundation | `src/modules/erpnext`, sync records, RBAC `finance.*`, Persian errors |
| Sale → Invoice → Payment | Outbox + `ErpNextAccountingProvider` + `erpnext_sync_records` status |
| Finance dashboard | `/finance` (native MOS UI) |
| Customer financial view | Customer profile «نمای مالی» |

Deferred (later phases): suppliers, purchases, inventory valuation, P&L / Balance Sheet.

## API (browser → MerchantOS only)

- `GET /api/v1/erpnext/finance/dashboard`
- `GET /api/v1/erpnext/finance/invoices`
- `GET /api/v1/erpnext/finance/sync`
- `GET /api/v1/erpnext/finance/sales/:saleId`
- `GET /api/v1/erpnext/finance/customers/:customerId`

Permission: `finance.view` (owner + store_manager). Cashiers denied.

## Never

- ERPNext URL/token in browser
- Desk iframe
- Blocking POS on ERP failure
