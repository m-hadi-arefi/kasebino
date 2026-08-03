/**
 * PointsLedgerEntry — append-only ledger entity (ADR-010 / ADR-091).
 * Mutations after insert are forbidden; balance corrections are new entries.
 */

import type { LedgerEntryType } from "../../../loyalty-domain/index.js";

export type PointsLedgerEntry = {
  readonly id: string;
  readonly walletId: string;
  readonly merchantId: string;
  readonly storeId: string;
  readonly storeMembershipId: string;
  readonly entryType: LedgerEntryType;
  /** Always positive; direction from entryType. */
  readonly points: number;
  /** saleId / orderId / job id for idempotency & audit. */
  readonly referenceId: string | null;
  readonly referenceKind: "sale" | "order" | "expiry_job" | "pos_redeem" | null;
  readonly createdAt: Date;
};

export type CreateLedgerEntryInput = {
  id: string;
  walletId: string;
  merchantId: string;
  storeId: string;
  storeMembershipId: string;
  entryType: LedgerEntryType;
  points: number;
  referenceId?: string | null;
  referenceKind?: PointsLedgerEntry["referenceKind"];
  now?: Date;
};

export function createLedgerEntry(
  input: CreateLedgerEntryInput,
): PointsLedgerEntry {
  if (!Number.isInteger(input.points) || input.points < 1) {
    throw new Error("ledger points must be a positive integer");
  }
  return {
    id: input.id,
    walletId: input.walletId,
    merchantId: input.merchantId,
    storeId: input.storeId,
    storeMembershipId: input.storeMembershipId,
    entryType: input.entryType,
    points: input.points,
    referenceId: input.referenceId ?? null,
    referenceKind: input.referenceKind ?? null,
    createdAt: input.now ?? new Date(),
  };
}
