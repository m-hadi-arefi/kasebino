# UI Rules

1. Invoke uiuxpromax before UI implementation (briefs must require Persian + RTL).
2. Follow `docs/uiux/*` and **`docs/rules/iranian-first-development.md`**.
3. **Persian + RTL first**; then mobile-first; a11y AA.
4. Default merchant/customer shells: `lang="fa"` `dir="rtl"`; logical CSS only for layout spine.
5. Persian typography; تومان + Jalali helpers for display; Iranian phone masks.
6. TanStack Query for server state via `src/data-fetching` (ADR-026); Zustand for POS ephemeral state only; local/Context for simple UI; URL for filters (ADR-025). Redux is not mandated.
7. RHF + Zod for forms via `src/forms-validation` (ADR-027) — Zod messages mapped to Persian UX copy; Iranian phone + تومان helpers; never trust client alone.
8. Frontend errors via `src/frontend-error-ux` (ADR-028) — map API/domain codes → Persian toast/inline/boundary; never show English stacks or OTP secrets to users; barcode-miss recovery; optimistic UI only where safe; optional `correlationId` for support.
9. Lighthouse thresholds per NFR; Iranian Android mobile viewports in reviews.
10. Pass `docs/checklists/iranian-feature-checklist.md` before marking UI complete.
