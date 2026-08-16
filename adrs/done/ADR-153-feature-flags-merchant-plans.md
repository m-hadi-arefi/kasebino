# ADR-153 — Merchant Subscription Plans, Fee Rules, and Feature Flags

| Field | Value |
| --- | --- |
| ID | ADR-153 |
| Status | `Proposed` |
| Date | 2026-08-10 |
| Folder | `adrs/tasks/` |

## Status

`Proposed` — Implementation-ready runtime gap ADR.

## Title

Merchant Subscription Plans, Fee Rules, and Feature Flags Runtime

## Context

The PRD mandates that the architecture must support configurable fee rules per merchant/plan (inactive during the free pilot), credit balances for SMS/campaigns, and feature flags for premium capabilities. Currently, the schema and codebase lack any notion of merchant plans, billing credits, or feature flags.

## Problem Statement

Without subscription plans and feature flags, MerchantOS cannot graduate from the free pilot phase into a monetized SaaS or support premium gates (e.g., advanced analytics or campaign SMS credits).

## Goals

- Implement a `merchant_plans` or `subscriptions` schema to track active plans and fee percentages.
- Implement a credit balance ledger for SMS and marketing campaigns.
- Introduce a feature flag evaluation service to gate premium UI/API capabilities.
- Ensure all fee rules remain inactive (or 0%) during the Phase 1 Kerman pilot.

## Non Goals

- Integration with a recurring billing provider (e.g., Stripe/Iranian equivalent) in this phase.
- Implementation of the actual marketing campaign engine (ADR-153 only lays the credit foundation).

## Functional Requirements

- FR-1: Merchants can be assigned a subscription tier (Free, Pilot, Premium) in the admin panel.
- FR-2: Feature flags are evaluated server-side and passed to the frontend to hide/disable premium features.
- FR-3: A credit ledger records SMS/campaign usage and top-ups.
- FR-4: POS transaction fees can be configured per merchant (default 0).

## Technical Design

1. Add `subscriptions` table linked to `merchants`.
2. Add `credits_ledger` for tracking SMS/campaign balances.
3. Add `feature_flags` mapping in `merchant_settings` or a dedicated table.
4. Implement `checkFeatureFlag` in the `auth` or `merchant` context.

## Dependencies

- None. Blocks future monetization.

## Iranian User Experience Requirements

- Admin panels for assigning plans must use Persian copy.
- If credit balances are shown to merchants, display in تومان.

## Completion Criteria

- [ ] Schema migrations applied for subscriptions and credit ledgers.
- [ ] Feature flag middleware/utility implemented and tested.
- [ ] Admin panel supports viewing/editing a merchant's plan.
