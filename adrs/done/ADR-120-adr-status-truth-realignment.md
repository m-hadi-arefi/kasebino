# ADR-120 — Realign ADR STATUS Boards with Code Truth

| Field | Value |
| --- | --- |
| ID | ADR-120 |
| Status | `Accepted` |
| Date | 2026-08-03 |
| Origin | Full repository audit (AUDIT_REPORT.md) |
| Folder | `adrs/done/` |

## Status

`Accepted` — Architecture-contract implemented 2026-08-05. Implementation tracking: see `adrs/STATUS.md`.

## Title

Realign ADR STATUS Boards with Code Truth

## Context

adrs/STATUS.md marked ~80 ADRs completed while docs/ards/STATUS.md shows nearly all ARDs todo and code lacks APIs/migrations.

## Problem

Governance lies break ard-to-code prioritization and create false production confidence.

## Current State

This audit moved ADRs into done/future/tasks; STATUS.md still at adrs root needs rewrite.

## Desired State

STATUS boards distinguish Architecture-Contract Landed vs Product-Runtime Complete; ARD board remains delivery SoT; no completed mark without runnable acceptance.

## Requirements

- Update adrs/STATUS.md
- Update docs/ards/STATUS.md notes
- Update AGENT.md path refs to adrs/done|future|tasks
- Definition of Done updated

## Technical Design

Two-axis status: Decision Accepted × Runtime Completeness {contract, partial, complete}. Sync with AUDIT_REPORT.md.

## Acceptance Criteria

- [x] No ADR marked runtime-complete without API+migration+tests evidence
- [x] Paths in skills/docs resolve
- [x] Audit index linked from README

## Risks

- Agent confusion during transition

## Dependencies

- This audit

## Estimated Complexity

**S**

## Iranian User Experience Requirements

- Persian copy + RTL for ops-facing UIs where merchant/admin visible.
- Obey `docs/rules/iranian-first-development.md` where applicable.

## Related Documents

- `AUDIT_REPORT.md`
- `PRD.md`

## Implementation notes (2026-08-05)

- `src/governance`: ADR_FOLDERS, RUNTIME_COMPLETENESS, STATUS_TRUTH, `assertRuntimeCompleteAllowed`
- AGENT.md two-axis DoD + `adrs/done|future|tasks` paths; README links AUDIT_REPORT
- STATUS boards clarify contract ≠ ARD completed ≠ production-ready
