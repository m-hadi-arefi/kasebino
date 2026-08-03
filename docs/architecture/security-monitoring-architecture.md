# Security Monitoring Architecture

## Purpose

Detect abuse, fraud signals, and operational security issues using MongoDB security collections, audit streams, auth events, and realtime admin topics.

## Signal classes

| Class | Examples |
| --- | --- |
| Authentication | OTP flood, verify failures, credential stuffing patterns |
| Authorization | Denied admin/tenant access spikes |
| Abuse | RateLimitTriggered, scrapers on storefront |
| Commerce fraud | Abnormal cancel rates, loyalty redeem spikes |
| Admin risk | Bulk suspend, unusual admin hours |

## Pipeline

```
Auth/API/domain → Audit + warehouse + security events → Rules engine (batch/stream)
                                              ↓
                         Alerts (EMQX admin topic, notification, future Pager)
```

## Correlation

Use `correlationId`, `ip`, `actorId`, `merchantId` to group incidents.

## Alerting severity

| Sev | Example |
| --- | --- |
| Sev1 | Auth system failure / mass OTP failure |
| Sev2 | Cross-tenant access attempt detected |
| Sev3 | Single-merchant abuse / rate limit storms |

## Privacy

Security docs may retain IP and phone hashes; access restricted to platform_admin; viewing security collections is itself audited.

## Related

ARD-026 Security Monitoring, ARD-022 Audit, ARD-018 Admin.
