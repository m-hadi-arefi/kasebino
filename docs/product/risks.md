# Risks

| ID | Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Merchants skip phone capture under peak pressure | Breaks CRM/loyalty flywheel | High | UX friction ≤ minimum; POS < 5s; keypad-first capture |
| R2 | SMS OTP delivery failures (Iran) | Auth blocked | High | Provider selection ADR; retries; clear UX; rate limits |
| R3 | Offline sync conflicts for queued sales | Incorrect inventory/loyalty | Medium | Explicit conflict policy (open Q5); online path P0 first |
| R4 | Scope creep into accounting/ERP | Delays MVP | Medium | Hard non-goals; ARD gate |
| R5 | Multi-tenant data leaks | Critical security | Medium | Tenant guards on every query; tests; audit |
| R6 | Cache staleness misleads POS | Wrong price/stock | Medium | Short TTLs for hot POS; event invalidation |
| R7 | Legal issues storing customer phones | Compliance | Medium | ADR-091 consent UX + soft delete + audit; counsel may refine copy |
| R8 | Payment PSP uncertainty | Online order monetization delayed | Medium | Abstract payment port; mock in MVP if needed |
| R9 | Realtime EMQX ops complexity | Missing live updates | Medium | Keep MQTT topics simple; fallback polling |
| R10 | AI implementation drift from ARDs | Architecture decay | High | ard-to-code skill; AGENT.md; validation gates |

## Risk ownership

Architecture/security risks → governed by `docs/rules/` and security ARDs.  
Product risks → track in product docs; resolve via `docs/decisions/`.
