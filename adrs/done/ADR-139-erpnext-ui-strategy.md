# ADR-139 - ERPNext UI Strategy

| Field | Value |
| --- | --- |
| ID | ADR-139 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext goal re-evaluation |
| Folder | `adrs/tasks/` |
| Affirms | ADR-134 |

## Status

`Accepted` — UI ownership.

## Title

ERPNext UI Strategy — MerchantOS UX vs ERP Desk

## Decision

### MerchantOS UI owns

- Cashier POS / offline staff PWA
- Merchant catalog, inventory UX, orders/pickup board, CRM, loyalty, analytics (Persian + Jalali)
- Customer storefront / store PWA / portal

### ERPNext Desk owns

- Accountant / finance manager back-office
- Chart of Accounts, period close, financial reports
- Purchasing / suppliers
- Tax templates and statutory-style configuration

### Forbidden

- Replacing MOS POS with ERPNext POS
- Replacing storefront with ERPNext Website / Web Shop
- Embedding Desk as the default merchant “home”
- Teaching agents that “integration = iframe Desk”

### Allowed later

- Deep link “Open in ERPNext” for a mapped Sales Invoice **for accountant roles only**
- Read-only MOS widgets labeled “از دفتر مالی” fed by ACL (never live GL in browser via API secret)

## Iranian User Experience Requirements

- **Persian localization impact:** All cashier/customer copy stays MOS Persian.
- **RTL requirements:** MOS RTL mandatory; Desk secondary for finance personas.
- **Mobile usability impact:** Retail on Iranian mobile PWAs; Desk not required on shop floor.
- **Iranian business workflow impact:** Counter speed > ERP form complexity.

## Completion Criteria

- [x] Strategy affirmed in AGENT/PRD/README
- [x] No Desk embedding in merchant/customer apps

## Related ADRs

- ADR-021, ADR-022, ADR-023, ADR-134, ADR-135
