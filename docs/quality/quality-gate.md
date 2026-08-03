# Quality Gate

An ARD may merge/complete only if:

- Acceptance criteria checked
- Global DoD satisfied
- lint/typecheck/tests green
- Architecture rules pass
- uiuxpromax evidence for UI ARDs (plan path referenced in progress-log)
- **Telemetry gate documented** (analytics/audit/tracking/dashboard metrics or N/A)
- **Database quality gate (all required when PG touched):**
  - [ ] Table design reviewed
  - [ ] Query patterns reviewed
  - [ ] Indexes reviewed (including composites)
  - [ ] Multi-tenancy reviewed
  - [ ] PostgreSQL performance reviewed
  - [ ] Drizzle schema reviewed (matches DB design)
  - [ ] Cache strategy reviewed
  - [ ] Migration strategy reviewed
  - [ ] Drizzle migrations generated and reviewed
- **Mongo quality gate (when analytics plane touched):**
  - [ ] Collection/index design reviewed
  - [ ] Retention/TTL reviewed
  - [ ] Tenant isolation reviewed
  - [ ] OLTP failure isolation verified
- No alternative SQL ORM present; Mongo not used as OLTP SoT
