# 09 — Authentication Architecture

## Requirements binding

AUTH-01..06, NFR-04, rate limits §11.4.

## Flow

```
1. POST /api/v1/auth/otp/request { phone }
2. Normalize Iranian MSISDN (09… / +98); create OtpChallenge (hash code, expiry, attempts)
3. Dev: return OTP in response; Prod: SMS send only (never OTP in body)
4. POST /api/v1/auth/otp/verify { phone, code }
5. On success: upsert AuthUser; optionally create Merchant (AUTH-06)
6. Issue JWT via NextAuth JWT strategy (ADR-033)
```

Contract + identity foundations: `src/merchant-auth`, `src/modules/identity` (ADR-031).
JWT session: `src/nextauth-jwt` + `src/modules/identity/infrastructure/auth` Auth.js JWT stub (ADR-033).
SmsPort console/mock until ADR-083 accepts a provider.

## JWT

- Stateless; no server session store
- Claims: sub, merchantId, roles, tokenVersion, iat, exp
- Rotation: bump tokenVersion on logout-all / security events; reject mismatched
- Prefer httpOnly secure cookies for web clients

## OTP policy

- TTL short (e.g. 2–5 minutes)
- Max attempts before invalidate
- Rate: 3 req/min OTP routes; auth routes 5/min
- Store hashed OTP, never plaintext at rest

## Dev vs prod

| Mode | OTP in API | SMS |
| --- | --- | --- |
| development | yes | no |
| production | never | yes |

## Merchant creation

First successful registration may create Merchant (AUTH-06) in same use case with outbox `MerchantCreated`.
