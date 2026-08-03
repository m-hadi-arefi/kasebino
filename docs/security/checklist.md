# Security Checklist

- [ ] HTTPS enforced in non-dev
- [ ] OTP never in prod responses
- [ ] Rate limits active
- [ ] Zod on inputs
- [ ] Drizzle only (parameterized; no string-concat SQL; no alternate ORMs)
- [ ] Tenant tests for new resources
- [ ] Audit on sensitive mutations
- [ ] Secrets in env
- [ ] Dependency audit on hardening ARD
- [ ] Repository/tenant filters reviewed on new tables
