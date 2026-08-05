# ADR-121 - Merchant Registration, Onboarding, and Multi-Store Setup UI

| Field | Value |
| --- | --- |
| ID | ADR-121 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Merchant Registration, Onboarding, and Multi-Store Setup UI

## Context

AUTH-06 merchant create-on-register; full multi-store mandatory (ADR-091). No onboarding UI/API beyond domain stubs. Journey J1 requires geo, branding, URL/QR awareness, first products, first POS sale.

## Problem Statement

New merchants cannot self-serve create account, first store (mandatory location), branding, or switch among stores.

## Goals

- Post-OTP onboarding wizard: create merchant → create first store (geo mandatory) → branding → see storefront URL/QR CTA → activation gates.
- Multi-store create/list/switch/manage.
- Persian RTL throughout.

## Non Goals

- Staff invite advanced HR workflows (basic role assign OK if domain supports; else owner-only MVP).
- Marketplace onboarding.
- Fee plan selection (free pilot).

## Functional Requirements

- FR-1: AUTH-06 create merchant on first registration handoff from ADR-095.
- FR-2: Mandatory address + lat/lng (LOC-01) before store active.
- FR-3: Branding fields (name, logo upload via ADR-111, theme colors within DS).
- FR-4: Show `/s/{slug}` and deep-link to QR print (ADR-104).
- FR-5: Store switcher affects active store context for POS/CRM/catalog.
- FR-6: Activation definition aligns with first `SaleCompleted` with phone (success metrics) - UI can track checklist progress.

## Technical Design

1. Wizard routes under `(merchant)` e.g. `/onboarding`.
2. APIs: merchant create, store create/update branding/geo, list stores, set active store cookie/claim.
3. Enforce activation policy before POS if product requires store completeness.
4. uiuxpromax brief; ADR-114 controls.

## Database Changes

- Merchants/stores via ADR-093; ensure slug uniqueness.

## Backend Changes

- Wire merchant/store use cases to APIs; active store context helper.

## Frontend Changes

- Onboarding wizard + store management/switcher UI.

## Admin Changes

- None (platform admin sees merchants via ADR-106).

## API Changes

- `/api/v1/merchants`, `/api/v1/stores`, branding/geo PATCH, active-store endpoint

## Security Considerations

- Only merchant roles managing own stores.
- Slug immutability or controlled rename policy (document; prefer immutable after publish).

## Edge Cases

- Abandoned onboarding resume.
- Duplicate slug.
- Switching store mid-POS cart - clear or warn.

## Acceptance Criteria

- [ ] New merchant completes onboarding with geo + branding.
- [ ] Storefront URL `/s/{slug}` resolves for created store.
- [ ] Merchant can create second store with isolated inventory/membership scope.
- [ ] Store switcher changes POS/catalog active store.
- [ ] Persian RTL checklist passes.

## Rollout Plan

After ADR-095 login; integrate ADR-104/111 when available (placeholders OK briefly).

## Dependencies

- ADR-005, ADR-006, ADR-091, ADR-093–095, ADR-104, ADR-111, ADR-114

## Risks

- Incomplete geo UX blocking activation - use clear map pin + address forms.

## Related Documents

- `docs/product/user-journeys.md` J1
- ADR-091 multi-store

## Iranian User Experience Requirements

- Persian wizard copy; RTL; Iranian address patterns; تومان only when showing prices later.
- uiuxpromax before UI.

## Estimated Complexity

**L**
