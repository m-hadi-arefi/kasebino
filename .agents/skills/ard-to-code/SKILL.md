---
name: ard-to-code
description: >-
  ADR-driven autonomous build loop for MerchantOS. Use when asked to run
  ard-to-code, continue platform build, implement next ADR, or advance the
  engineering roadmap. Works exclusively on ADRs in adrs/tasks/, implements
  one ADR at a time with full validations (including Iranian First UX), moves
  completed ADRs to adrs/done/, continues until tasks/ is empty or blocked.
---

# ard-to-code (ADR-Driven)

Build MerchantOS **only from unfinished ADRs in `adrs/tasks/`**, in numeric / dependency order.

**Work queue:** `adrs/tasks/` only.  
**Do not** pick ADRs from `adrs/done/` or `adrs/future/`.  
**ADRs are the source of truth for architecture.**  
**ARDs** (`docs/ards/`) are delivery packages mapped from ADRs — implement the ADR’s requirements, updating related ARDs as evidence of delivery.

**Iranian First is mandatory:** MerchantOS is an Iranian-native retail OS. Persian, RTL, Jalali, تومان, and Iranian workflows are part of every implementation cycle.

## Hard prohibitions

- NEVER write code before reading the target ADR, its dependency ADRs, AGENT.md, `docs/rules/iranian-first-development.md`, and related architecture/rules.
- NEVER invent architecture that contradicts an Accepted ADR.
- NEVER skip validation (tests, lint, typecheck, applicable quality gates).
- NEVER implement UI without **uiuxpromax** first (ADR-021).
- NEVER use any SQL ORM except **Drizzle** (ADR-042).
- NEVER use MongoDB as OLTP SoT (ADR-056).
- NEVER implement delivery/courier/shipping (ADR-082 / ADR-015).
- NEVER conflate staff PWA vs store PWA (ADR-022 / ADR-023).
- NEVER ship English-only or LTR-only merchant/customer UX for MVP surfaces.
- NEVER mark an ADR complete if acceptance/completion criteria fail — including Iranian First checklist when UX is in scope.
- NEVER start a second ADR while one is `in_progress`.
- NEVER select an ADR outside `adrs/tasks/` for implementation.

## Preconditions (mandatory reading before any coding)

1. `AGENT.md`
2. `docs/rules/iranian-first-development.md`
3. `docs/checklists/iranian-feature-checklist.md` (know the DoD gate)
4. `adrs/README.md` (folder layout: `tasks/` = work queue)
5. `adrs/STATUS.md` (tasks section + done/future boards)
6. `AUDIT_REPORT.md` Critical path (recommended order for task ADRs)
7. Coding/architecture rules under `docs/rules/*` as applicable
8. `PRD.md` / `docs/product/store-first-evolution.md` when product scope touched
9. Dependency ADRs may live in `adrs/done/` — **read** them, do not re-implement them

## Workflow

### Step 1 — Read tasks queue

1. List files in `adrs/tasks/` (`ADR-*.md`).
2. Read `adrs/STATUS.md` (especially the **tasks/** section).
3. Read Critical path ordering in `AUDIT_REPORT.md` when choosing among ready ADRs.

If `adrs/tasks/` is empty, stop and report: queue drained (all task ADRs moved to `done/` or none remain).

### Step 2 — Find first incomplete ADR in `adrs/tasks/`

1. If any ADR in `adrs/tasks/` has implementation status `in_progress` (STATUS or plan), **resume it**.
2. Else select the earliest ready ADR among files in `adrs/tasks/` by:
   - Critical path order from `AUDIT_REPORT.md` when specified
   - Else lowest ADR number (`ADR-092` before `ADR-093`, …)
   - All prerequisite ADRs named in the file (Dependencies / Related) must already be in `adrs/done/` **or** also listed as satisfied / ports-allowed
   - Skip ADRs blocked on Proposed vendor decisions (e.g. production SMS/PSP) unless implementing ports/mocks only as the ADR allows
3. If none available, stop and report blockers (missing deps still in `tasks/`, or Proposed-vendor block).

Record the selection as `in_progress` in `adrs/STATUS.md` (tasks notes / impl column as used by the board).

### Step 3 — Iranian First gate (before plan)

1. Re-read `docs/rules/iranian-first-development.md`
2. Read the target ADR’s **Iranian User Experience Requirements** section (if present)
3. Read related ARDs’ **Localization / RTL / Persian UX / Iranian User Considerations** sections
4. Answer AGENT checks:
   - Persian text?
   - RTL?
   - Jalali?
   - تومان?
   - Iranian user behavior?
   - Iranian mobile devices?
5. Record impacts in the implementation plan (cannot be an afterthought)

### Step 4 — Read the ADR

Read the full file at `adrs/tasks/ADR-XXX-*.md`.

### Step 5 — Read dependency and related ADRs

Read every prerequisite ADR listed under Dependencies / Related ADRs:

- Prefer paths under `adrs/done/` and `adrs/tasks/` as they exist on disk
- Include Iranian UX sections when present

### Step 6 — Read affected ARDs and architecture docs

- Related ARDs from ADR “Implementation Requirements” and `docs/ards/`
- Linked docs under `docs/architecture/*`, `docs/tech/*`, `docs/uiux/*`
- Telemetry pack when emitting events (analytics/audit/warehouse/observability architectures)
- Store-first pack when touching storefront/membership/pickup/PWA/QR

### Step 7 — Gates before plan

1. **Iranian First gate** (Step 3) — required every cycle
2. **Telemetry gate:** analytics / audit / tracking / dashboard metrics (or N/A)
3. **Persistence gate:** PG/Drizzle and/or Mongo design per ADR
4. **uiuxpromax** if UI in scope (briefs must specify Persian + RTL)
5. Confirm ADR-015/082 scope (no delivery)

### Step 8 — Generate implementation plan

Write `docs/execution/plans/ADR-XXX.md` with:

- Summary of decision being implemented
- Task breakdown **including localization/RTL/Jalali/تومان tasks**
- Schema/API/UI/events/cache changes
- Test matrix (include Persian strings / RTL where applicable)
- Related ARD checkboxes to update
- Iranian feature checklist items in scope
- Risks
- Post-complete folder move: `adrs/tasks/` → `adrs/done/`

**Do not code before the plan exists.**

### Step 9 — Implement ONLY this ADR

- Smallest change that realizes the Decision / Requirements
- Obey DDD layering, Drizzle-only SQL, Mongo analytics plane rules
- Implement Persian copy + RTL behavior for any user-facing surface in scope
- Update related ARD status/checklists when that package is fulfilled

### Step 10 — Run required validations

- Tests (unit/integration/e2e as applicable)
- Lint (0 warnings)
- Typecheck strict
- Architecture / DB / Mongo / security gates as applicable
- Lighthouse when UI primary surfaces in scope
- **`docs/checklists/iranian-feature-checklist.md`** for in-scope UX

### Step 11 — Verify acceptance / completion criteria

Use the ADR’s Completion Criteria / Requirements section plus any mapped ARD acceptance criteria.

**A task cannot be marked complete unless:**

- RTL works (for UI in scope)
- Persian text works (for user-visible scope)
- Mobile experience works (for UI in scope)
- Iranian UX requirements in the ADR/ARD are satisfied

### Step 12 — Mark ADR completed and move file

Only if Step 10–11 pass:

1. **Move** `adrs/tasks/ADR-XXX-*.md` → `adrs/done/ADR-XXX-*.md` (same filename)
2. Update the ADR front-matter / Folder field from `adrs/tasks/` to `adrs/done/` if present
3. `adrs/STATUS.md` → remove from tasks board (or mark complete) and add under **done/** with `complete` + date
4. Append row to `adrs/REORGANIZATION_INDEX.md` move log (or file list): tasks → done
5. Append `docs/execution/progress-log.md`
6. Sync related docs / ARD STATUS if behavior clarified

If failed: leave file in `adrs/tasks/`, keep `in_progress` or set `blocked` with reason — **never** move to `done/`.

### Step 13 — Continue

Return to Step 1 until:

- `adrs/tasks/` is empty (all moved to `done/`), or  
- Blocked on deps / Proposed vendor ADR / human decision, or  
- User asked to stop after one ADR

## Mapping ADR ↔ ARD

Prefer implementing through the ARD that packages the feature, but **schedule and truth come from ADRs in `adrs/tasks/`**. If an ARD conflicts with an Accepted ADR in `done/`, stop and update docs (Accepted ADR wins until superseded).

## Output each cycle

1. ADR selected (path under `adrs/tasks/`)  
2. Iranian First gate results  
3. Dependencies read  
4. Plan path  
5. Changes made  
6. Validations + Iranian checklist  
7. STATUS change + file move to `adrs/done/`  
8. Next ADR remaining in `adrs/tasks/`  
