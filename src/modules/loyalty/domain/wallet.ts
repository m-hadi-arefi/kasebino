/**
 * Wallet aggregate (ADR-010) — balance scoped to StoreMembership.
 * Never negative. lastEarnAt drives ADR-091 expiry clock.
 */

export type Wallet = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  /** StoreMembership.id — unique wallet key in MVP. */
  readonly storeMembershipId: string;
  readonly customerId: string;
  /** Non-negative integer points balance. */
  balance: number;
  /** Optimistic concurrency for redeem/earn races. */
  version: number;
  lastEarnAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreateWalletInput = {
  id: string;
  merchantId: string;
  storeId: string;
  storeMembershipId: string;
  customerId: string;
  now?: Date;
};

export function createWallet(input: CreateWalletInput): Wallet {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId,
    storeMembershipId: input.storeMembershipId,
    customerId: input.customerId,
    balance: 0,
    version: 0,
    lastEarnAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function creditWallet(
  wallet: Wallet,
  points: number,
  at: Date = new Date(),
): void {
  if (!Number.isInteger(points) || points < 1) {
    throw new Error("credit points must be a positive integer");
  }
  wallet.balance += points;
  wallet.lastEarnAt = at;
  wallet.version += 1;
  wallet.updatedAt = at;
}

/**
 * Debit points for redeem or expire. Rejects negative resulting balance.
 */
export function debitWallet(
  wallet: Wallet,
  points: number,
  at: Date = new Date(),
): void {
  if (!Number.isInteger(points) || points < 1) {
    throw new Error("debit points must be a positive integer");
  }
  if (wallet.balance < points) {
    throw new Error("INSUFFICIENT_BALANCE");
  }
  wallet.balance -= points;
  wallet.version += 1;
  wallet.updatedAt = at;
}
