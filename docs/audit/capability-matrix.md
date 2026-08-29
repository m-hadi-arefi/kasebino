# Feature capability matrix

**Audit date:** 2026-08-09 (rows refreshed 2026-08-29 for staff / images / hours / movements — see also [`frontend-completion-audit.md`](./frontend-completion-audit.md))  
Statuses: `IMPLEMENTED` | `PARTIALLY_IMPLEMENTED` | `PLACEHOLDER` | `MISSING` | `BROKEN`

Every row cites code paths inspected in this audit.

---

## Identity & access

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| Merchant SMS OTP login | IMPLEMENTED | `app/api/v1/auth/merchant/otp/*`, `src/modules/identity`, NextAuth `app/api/auth/[...nextauth]` | Production SMS provider (`adrs/future/ADR-115`) — console SMS allowed only local |
| Customer SMS OTP | IMPLEMENTED | `src/modules/customer-identity`, `app/api/v1/customer/auth/otp/*`, storefront login UI | Same SMS production gap |
| RBAC matrix + route enforcement | PARTIALLY_IMPLEMENTED | `src/rbac/index.ts`, `authorization.test.ts`, handlers use `requireMerchantPermission*` | Roles not persisted per employee; default JWT role often owner when empty |
| Employee invite / staff CRUD | IMPLEMENTED | `app/api/v1/staff/*`, `/roles`, `/permissions`, `app/(merchant)/staff`, ADR-144 | Per-staff fine-grained store grants still shallow |
| Platform admin | PARTIALLY_IMPLEMENTED | `src/modules/admin`, `app/(admin)/admin/*`, merchant activate/suspend APIs | Fraud/security monitoring largely noop port |

---

## Store & merchant

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| Merchant create / onboarding | IMPLEMENTED | `src/modules/merchant`, `app/(merchant)/onboarding`, merchants APIs | Deep settings UX shallow |
| Multi-store | IMPLEMENTED | `createStore`, stores list, `store-switcher`, active store cookie | Per-staff store grants |
| Store branding / assets | PARTIALLY_IMPLEMENTED | Branding domain, MinIO upload APIs, onboarding | Dedicated post-create branding editor limited |
| Store hours | PARTIALLY_IMPLEMENTED | Domain + UC `updateHours`, PATCH `/api/v1/stores/{id}` hours field (ADR-149) | Merchant hours UI wired under ADR-155 (`/stores/[id]/hours`) |
| Location + QR | IMPLEMENTED | `stores/[id]/location`, `stores/[id]/qr`, QR APIs | — |
| `merchant_settings` KV table | PLACEHOLDER | Schema `merchant_settings` | Runtime settings use `merchants.settings_json` |

---

## Catalog

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| Product CRUD + soft delete | IMPLEMENTED | `src/modules/catalog`, `app/api/v1/catalog/products/*`, products UI, `catalog/index.test.ts` | — |
| SKU / barcode | IMPLEMENTED | Unique indexes; lookup / by-barcode APIs; POS camera sheet | — |
| Categories | IMPLEMENTED | Categories CRUD API + product form | Hierarchical categories |
| Images | PARTIALLY_IMPLEMENTED | Schema + UC + handlers (ADR-147); App Router + product form UI (ADR-155) | Public binary GET proxy for merchant thumbnails optional follow-up |
| Variants / brands | MISSING | Domain comment single-SKU MVP | — |
| Sell price (IRR minor) | IMPLEMENTED | `priceAmountMinor` + تومان UI | — |
| Cost / tax / catalog discount | MISSING | — | Cost, tax rates, line discounts |
| Product UOM columns | PLACEHOLDER | Schema `base_unit_code` / `quantity_scale` | Domain/UC ignore columns |

---

## Inventory

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| Stock balance per store | IMPLEMENTED | `stock_items`, inventory APIs/UI, UC | — |
| Manual adjustment | IMPLEMENTED | `adjustStock`, `/inventory/adjust`, outbox event | — |
| Movement ledger | PARTIALLY_IMPLEMENTED | Ledger + `handleListStockMovements` (ADR-148); App Router + inventory history UI (ADR-155) | Was missing route file before ADR-155 |
| Negative stock reject | IMPLEMENTED | UC rejects qty &lt; 0 | Allow-negative mode n/a |
| Reservation for online orders | PLACEHOLDER | `createStubInventoryReservePort` default; composition does **not** inject real port (`create-api-context.ts` L412–418) | Real reserve/release + table |
| Pickup paid decrement UC | PARTIALLY_IMPLEMENTED | `decrementForPickupPaid` exists + unit tested | Not called from production ordering wiring |
| Warehouse multi-bin | MISSING | Store-scoped only | — |

---

## POS

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| Checkout CompleteSale | IMPLEMENTED | `pos` UC + `/api/v1/pos/sales` + `pos-register.tsx` + tests | — |
| Barcode / search | IMPLEMENTED | Lookup APIs + camera sheet | — |
| Offline queue + sync + conflict | IMPLEMENTED | `src/pos-offline`, `/api/v1/sales/sync`, review UI | — |
| HTML receipt + MinIO | IMPLEMENTED | `receipt-html`, object storage, `/sales/[id]/receipt` | Hardware printer bridge |
| Printer / cash drawer | MISSING | — | ESC/POS, kick |
| Card terminal | PARTIALLY_IMPLEMENTED | Tender enum `card_terminal` persisted | No acquiring device/PSP link |
| Loyalty earn on sale | IMPLEMENTED | `createLoyaltyEarnPort` wired in composition | — |

---

## CRM / loyalty / customer portal

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| Store membership | IMPLEMENTED | CRM UCs, APIs, customers UI, tests | Rich CRM fields (name/email) |
| POS phone capture → membership | IMPLEMENTED | CompleteSale path | — |
| Segments new/returning/lapsed | IMPLEMENTED | `segments.ts`, `/crm/segments` | Custom segments |
| Purchase history (POS) | PARTIALLY_IMPLEMENTED | Membership history = completed sales | Unified POS+orders timeline |
| Loyalty wallet / rules / redeem | IMPLEMENTED | loyalty module, APIs, UI, expiry job in worker | Online-order earn unwired (`earnPointsForOrder` unused) |
| Coupons | PLACEHOLDER | `coupons` table only (`schema/loyalty.ts`) | Domain/API/UI |
| Customer credit/debt (native) | MISSING | — | No AR ledger in CRM |
| Customer finance overlay (ERP) | PARTIALLY_IMPLEMENTED | `/erpnext/finance/customers/[id]` + panel | Depends on ERP mode; fake zeros common |
| Customer addresses | MISSING | Orders schema: no shipping address (pickup-only) | Intentional for delivery; no saved address book |
| Customer portal (orders/wallet/rewards) | IMPLEMENTED | Storefront dashboard routes + APIs | — |

---

## Orders & payments

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| Online pickup order | IMPLEMENTED | ordering module, storefront checkout, merchant orders board | — |
| Lifecycle transitions | IMPLEMENTED | preparing/ready/picked-up/complete/cancel/refund routes | — |
| Delivery | MISSING | Explicitly forbidden (`DELIVERY_FORBIDDEN`) | Correct non-goal |
| Online payment intents | PARTIALLY_IMPLEMENTED | Full domain + HTTP against `SandboxPaymentGateway` only | Iranian production PSP (ADR-084) |
| Refunds (sandbox) | IMPLEMENTED | payments refund UC + order orchestration | Real PSP refunds |
| Payment reconciliation | MISSING | — | Settlement / drawer recon |
| Fees | PLACEHOLDER | `feeChargedMinor` always 0 (FEE_POLICY) | — |

---

## Accounting / ERPNext

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| AccountingProvider port + noop/fake | IMPLEMENTED | `create-accounting-provider.ts` | Default env = **noop** |
| ErpNextAccountingProvider write path | PARTIALLY_IMPLEMENTED | Item/Customer/SINV/PE/Stock projectors + mocked tests | Live dual-run soak; tax; purchases/returns unsupported |
| Outbox accounting consumer | IMPLEMENTED | `accounting/application/outbox-handler.ts` + worker wire | — |
| Entity mappings | IMPLEMENTED | `external_entity_mappings` | — |
| Sync status table + UI | IMPLEMENTED | `erpnext_sync_records`, `/finance/sync` | Manual retry UX thin |
| Finance dashboard / invoices API | PARTIALLY_IMPLEMENTED | `/erpnext/finance/*`, Persian UI | Live reader AR/AP=`0`, profit=`null`, today=month (`erpnext-finance-reader.ts`) |
| Native GL / tax books in MOS | MISSING | By design — ERPNext owns books | — |
| Purchasing / AP | PLACEHOLDER | `recordPurchase` unsupported across providers | Phases 5–7 |

---

## Analytics / notifications / platform

| Feature | Status | Evidence | Missing |
| --- | --- | --- | --- |
| Merchant OLTP dashboards | PARTIALLY_IMPLEMENTED | Analytics projection tables + APIs/UI | Depth vs PRD AN-* varies |
| Clickstream / beacon | IMPLEMENTED | telemetry + analytics routes; Mongo plane | Prod retention ops |
| In-app notifications | IMPLEMENTED | notifications module + merchant/customer UIs | SMS blast campaigns |
| Health / ready probes | IMPLEMENTED | `/api/health`, `/api/ready` | — |
| Observability / APM | MISSING | Future ADRs 074/075/116 | Tracing/metrics/alerts |
| CD / DR | MISSING | Future ADR-070/073/118 | — |

---

## Status rollup (MVP lens)

| Domain | Overall |
| --- | --- |
| POS + offline | Strong |
| Storefront pickup + orders UI | Strong (inventory stub softens) |
| CRM membership + loyalty (POS) | Strong / partial coupons |
| Catalog core | Strong; media UI landed; tax/variants still limited |
| Inventory ops | Strong POS path; **broken online stock** via stub ports |
| Payments | Sandbox only |
| Staff ops | Strong (invite/roles UI landed) |
| Finance/ERPNext | Adapter+UI landed; books not trusted yet |
