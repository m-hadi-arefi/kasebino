# Audit Rules

1. Sensitive mutations MUST emit audit records (see audit-architecture action list).
2. Audit is insert-only from application perspective.
3. Include actor, action, entity, result, correlationId, merchantId when applicable.
4. Prefer MongoDB `mos_audit` as long-term audit store; PG thin audit optional for same-TX needs.
5. Merchants must not read other tenants’ audit.
6. Admin viewing of audit/security data is itself audited.
7. Retention per `data-retention-architecture.md`; legal hold overrides TTL.
8. Failures to persist audit after commit must retry (outbox/buffer) and metric-alert — do not silently drop forever.
9. `before`/`after` summaries only — minimize PII.
10. ARD-022 defines the platform; feature ARDs hook AuditPort.
