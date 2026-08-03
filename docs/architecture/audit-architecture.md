# Audit Architecture

## Purpose

Provide **immutable, queryable audit trails** for sensitive actions across MerchantOS for compliance, fraud investigation, and admin accountability.

## Dual-write policy

| Class | Store | Rationale |
| --- | --- | --- |
| Hot transactional audit hooks (optional thin) | PostgreSQL `audit_logs` | Same-TX optional for critical mutations during MVP bootstrap |
| System of record for audit analytics & long retention | **MongoDB `mos_audit`** | Append-only scale, flexible payload, TTL/archive policies |

**Rule:** Every sensitive mutation MUST produce an audit record in MongoDB via AuditPort (async after commit preferred; sync only when legally required and documented in ARD).

## Sensitive actions (always audited)

- Auth: OTP request volume anomalies, login success/failure, logout-all, role changes  
- Merchant: create, activate, suspend, settings with billing impact  
- Catalog/inventory: hard price changes, stock adjust, mass deletes  
- Sales: complete, cancel  
- Loyalty: redeem, manual adjustments  
- Orders/payments: status transitions, webhook-driven paid  
- Admin: any platform_admin action  
- Privacy: customer soft-delete / export requests (when added)  

## Audit document schema

```json
{
  "eventId": "uuid",
  "occurredAt": "ISO-8601",
  "merchantId": "uuid|null",
  "actorId": "uuid|null",
  "actorRole": "string",
  "action": "sale.complete|merchant.suspend|...",
  "entityType": "sale|merchant|...",
  "entityId": "uuid|null",
  "result": "success|failure|denied",
  "ip": "string|null",
  "userAgent": "string|null",
  "correlationId": "uuid",
  "before": {},
  "after": {},
  "metadata": {}
}
```

`before`/`after` are **summaries**, not full PII dumps when avoidable.

## Integrity & immutability

- Application must not expose update/delete APIs for audit docs (except retention tooling with break-glass)
- Prefer insert-only collections
- Optional hash chain (`prevHash`, `hash`) for tamper evidence (ARD-022 stretch)

## Query patterns

- By merchant + time  
- By actor  
- By entity  
- By action type  
- Security investigations: failures + denies  

## Retention

See data retention strategy in AGENT.md / `data-retention-architecture.md`.

Default recommendation:

| Class | Hot retention | Archive |
| --- | --- | --- |
| Security audit | 365–730 days | Cold object store optional |
| Admin actions | 730 days | |
| Routine entity updates | 180–365 days | |

Legal holds override TTL.

## AuthZ

- Merchants: limited view of their own operational audit (optional P1)  
- Platform admin: full search with access itself audited  
- Never expose other merchants’ audit to a merchant  

## Relation to observability

Audit ≠ application logs. Logs are operational; audit is evidence. Both may share `correlationId`.

## Related

- ARD-022 Audit Logging System  
- [mongodb-architecture.md](./mongodb-architecture.md)  
- [security-monitoring-architecture.md](./security-monitoring-architecture.md)  
