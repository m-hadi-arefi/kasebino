# ADR-0001 — SMS Provider (Iran Phase 1)

## Status

Proposed

## Context

OTP login requires reliable SMS delivery in Iran. Cost and deliverability vary.

## Decision

Pending human selection. Architecture uses `SmsSender` port with provider adapter.

## Consequences

- Auth ARD-002 ships with port + console/dev adapter
- Production adapter added when provider chosen without rewriting domain
