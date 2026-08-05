# Architecture Decision Records (ADRs)

Canonical architecture decisions for MerchantOS.

## Folder layout

| Folder | Contents |
| --- | --- |
| [`done/`](./done/) | ADR implemented (contracts + domain + tests) — **87** |
| [`future/`](./future/) | Not yet implemented — **10** (070–075, 079–080, 083–084) |
| [`tasks/`](./tasks/) | Runtime/MVP wiring ADRs from audit — **29** |
| [`STATUS.md`](./STATUS.md) | Implementation board |
| [`REORGANIZATION_INDEX.md`](./REORGANIZATION_INDEX.md) | Move log |

Audit product gaps: [`../AUDIT_REPORT.md`](../AUDIT_REPORT.md). ARD delivery board: [`../docs/ards/STATUS.md`](../docs/ards/STATUS.md).

## Rules

1. No feature without a covering ADR.
2. ADR `complete` ≠ ARD `completed` ≠ production-ready.
3. Remaining product wiring lives in `tasks/` and ARDs.
4. Iranian First UX is mandatory for user-facing work.
