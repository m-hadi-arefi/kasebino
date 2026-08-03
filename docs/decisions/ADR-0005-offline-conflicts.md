# ADR-0005 — Offline Sale Conflict Resolution

## Status

Proposed

## Context

PWA queued sales may conflict with stock/price changes.

## Decision (default engineering recommendation)

Reject-and-review on inventory shortage; never silent double-sell. Final product confirmation pending.

## Consequences

ARD-017 must implement conflict UX and idempotent sync.
