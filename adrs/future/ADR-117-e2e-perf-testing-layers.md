# ADR-117 - E2E Playwright, Performance Budgets, and Lighthouse Gates

| Field | Value |
| --- | --- |
| ID | ADR-117 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

E2E Playwright, Performance Budgets, and Lighthouse Gates

## Context

Contract/unit Vitest suite exists; ADR-079 not implemented; no Playwright e2e, perf harness, or automated Lighthouse gates for landing/primary screens (NFR-01/08/09).

## Problem Statement

No true user-journey coverage; POS/search budgets and landing Lighthouse ≥95 are unmeasured in CI.

## Goals

- Thin Playwright suite: merchant OTP → POS sale; customer pickup happy path.
- Perf smoke for barcode/search budgets.
- Lighthouse CI (or equivalent) for marketing landing and primary merchant screens.

## Non Goals

- 100% UI coverage.
- Replacing unit/contract tests.

## Functional Requirements

- FR-1: Critical path e2e against Compose stack with seed data.
- FR-2: Nightly or optional CI job for perf.
- FR-3: Robust selectors for Persian UI (role/text).
- FR-4: Landing Lighthouse Performance/SEO/A11y/Best Practices gate (≥95 target).
- FR-5: Primary merchant screens Lighthouse >90 DoD support.

## Technical Design

1. Playwright config + `e2e/` tests.
2. Seed script for merchant/store/product.
3. Perf harness measuring barcode lookup p95 in integration/e2e hooks.
4. Lighthouse CI config targeting `/` and `/dashboard`/`/pos` when authenticated harness allows.

## Database Changes

- Seed data only.

## Backend Changes

- Test harness utilities; possibly test-only flags.

## Frontend Changes

- Stable `aria` labels on critical controls.

## Admin Changes

- Optional e2e for admin suspend later.

## API Changes

- None.

## Security Considerations

- E2E secrets only in CI env; no prod credentials.
- Disable SMS side effects (mock provider).

## Edge Cases

- Flaky camera tests - mock barcode input path.
- Auth cookie handling in Playwright.

## Acceptance Criteria

- [ ] Playwright merchant OTP→sale path green locally against Compose.
- [ ] Customer pickup path green with sandbox payment.
- [ ] Documented perf smoke for search/barcode budgets.
- [ ] Landing Lighthouse job exists with ≥95 thresholds configured.
- [ ] No empty placeholder tests.

## Rollout Plan

Add after auth+POS+storefront APIs exist; until then keep suite skipped behind flag.

## Dependencies

- ADR-078, ADR-079 (future), ADR-095, ADR-096, ADR-100, ADR-102, ADR-122

## Risks

- Flaky e2e delaying CI - quarantine with explicit ownership.

## Related Documents

- `PRD.md` NFR-01/08/09, DoD
- ADR-078

## Iranian User Experience Requirements

- Tests assert Persian critical strings/RTL where stable.

## Estimated Complexity

**L**
