# Coding Rules

1. No product code outside an active ADR/ARD implementation session (ard-to-code).
2. Prefer clarity over cleverness; match existing patterns once code exists.
3. Keep functions cohesive; orchestrate in application services.
4. No secrets in repo; use env schema.
5. Soft delete by default; never hard-delete auditable business data in MVP.
6. Every public function touching tenants accepts/uses TenantContext.
7. Update docs when behavior changes.
8. Do not add unsolicited markdown files during feature work beyond ARD checklist.
9. **Iranian First:** user-visible merchant/customer surfaces must be Persian + RTL; follow `iranian-first-development.md` and pass the Iranian feature checklist when UX is in scope.
10. Prefer logical CSS and presentation helpers for Jalali/تومان over one-off formatting.
