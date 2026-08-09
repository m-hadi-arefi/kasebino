# ERPNext Integration Model (Frappe)

> How systems integrate with ERPNext — patterns MerchantOS will use later.

## Transport

Frappe auto-generates REST for every DocType:

| Operation | HTTP |
| --- | --- |
| List | `GET /api/resource/:Doctype` |
| Create | `POST /api/resource/:Doctype` |
| Read | `GET /api/resource/:Doctype/:name` |
| Update | `PUT /api/resource/:Doctype/:name` |
| Delete | `DELETE /api/resource/:Doctype/:name` |
| RPC | `GET|POST /api/method/<dotted.path>` |

Filters, fields, pagination (`limit_start`, `limit_page_length`), `order_by` are supported on list.

Submit/cancel are typically method calls or DocType workflow actions (not naive field updates of `docstatus`).

## Authentication options

1. **Token** (preferred for workers): `Authorization: token api_key:api_secret`
2. **Session cookie** via `/api/method/login` (browser-like; avoid for workers)
3. **OAuth2 Bearer** for delegated third-party apps

Tokens inherit **User roles**. Use a dedicated integration User with least privilege.

## Integration patterns

| Pattern | When | MOS stance |
| --- | --- | --- |
| Synchronous REST in request path | Low latency APIs | **Forbidden** for POS/checkout |
| Outbox → worker → REST | Durable async | **Required** (ADR-126/129) |
| Webhooks from ERPNext | E→M notifications | Future for purchase receipts / balance alerts |
| Direct SQL replication | — | Forbidden |
| Shared DB | — | Forbidden |

## Idempotency

Frappe does not give MOS-grade idempotency keys on all DocTypes. MerchantOS must:

1. Prefer `external_entity_mappings` uniqueness `(provider, entity_type, entity_id)`.
2. Store MOS `saleId` / `idempotencyKey` in a custom field or naming series mapping.
3. On retry: lookup mapping → skip create if external id exists (`alreadyApplied`).
4. Use `processed_events` for consumer-side once-only processing.

## Draft vs Submit

Recommended worker behavior:

```text
POST draft Sales Invoice
  → validate response
  → submit via whitelisted method / submit API
  → persist mapping(external_id = invoice.name)
```

Never leave financial documents unsubmitted if the business event is “completed sale”, unless a deliberate two-phase ADR says otherwise.

## Naming

ERPNext `name` is the document primary key (often naming series like `SINV-0001`). Always store it in `external_entity_mappings.external_id`. Do not use display titles as keys.

## Hooks / custom apps (future ops)

Heavy customization belongs in a **separate Frappe app** on the ERP side (server scripts, custom fields), not inside MOS core. MOS ACL maps DTOs ↔ DocTypes only.

## Failure model

```text
Local MOS commit + outbox
  → worker retry / backoff
  → DLQ
  → manual retry
```

ERP downtime must not fail retail UX.

## Related docs

- [integration-boundary.md](./integration-boundary.md)
- [erpnext-security.md](./erpnext-security.md)
- ADR-129 Synchronization
