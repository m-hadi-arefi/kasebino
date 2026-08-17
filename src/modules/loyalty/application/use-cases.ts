import { randomUUID } from "node:crypto";

import type { LoyaltyEarnPort } from "../../pos/application/ports.js";
import { LOYALTY_DECISION } from "../domain/contracts/index.js";
import { calculateEarnPoints } from "../domain/earn-calculator.js";
import { shouldExpireWallet } from "../domain/expiry-policy.js";
import {
  pointsEarnedEvent,
  pointsExpiredEvent,
  pointsRedeemedEvent,
} from "../domain/events.js";
import {
  createPointRule,
  updatePointRule,
  type PointRule,
} from "../domain/point-rule.js";
import { createLedgerEntry } from "../domain/points-ledger.js";
import type {
  PointRuleRepository,
  PointsLedgerRepository,
  WalletRepository,
} from "../domain/repositories.js";
import {
  createWallet,
  creditWallet,
  debitWallet,
  type Wallet,
} from "../domain/wallet.js";
import { LoyaltyDomainError } from "./errors.js";
import type { DomainEventBase } from "../../../shared/ddd/index.js";
import type { OutboxStore } from "../../../events/outbox/index.js";
import { envelopeFromDomainEvent } from "../../../events/contracts/event-driven/index.js";

export type LoyaltyUseCaseDeps = {
  wallets: WalletRepository;
  rules: PointRuleRepository;
  ledger: PointsLedgerRepository;
  now?: () => Date;
  idFactory?: () => string;
};

export type ConfigurePointRuleInput = {
  merchantId: string;
  storeId: string;
  amountMinorPerPoint?: bigint;
  pointsPerUnit?: number;
  /** `null` disables expiry for this store. */
  expiryMonthsAfterLastEarn?: number | null;
};

export type EarnForSaleInput = {
  saleId: string;
  merchantId: string;
  storeId: string;
  membershipId: string;
  customerId: string;
  totalAmountMinor: bigint;
};

export type EarnForOrderInput = {
  orderId: string;
  merchantId: string;
  storeId: string;
  membershipId: string;
  customerId?: string;
  totalAmountMinor: bigint | number;
};

export type RedeemPointsInput = {
  merchantId: string;
  storeId: string;
  membershipId: string;
  points: number;
  referenceId?: string;
};

export type ExpireStaleWalletsInput = {
  merchantId?: string;
  storeId?: string;
  /** Batch size for scheduled worker (ADR-035). */
  limit?: number;
};

function requireIds(merchantId: string, storeId: string): void {
  if (!merchantId.trim()) throw new LoyaltyDomainError("INVALID_MERCHANT");
  if (!storeId.trim()) throw new LoyaltyDomainError("INVALID_STORE");
}

async function ensureRule(
  deps: LoyaltyUseCaseDeps,
  merchantId: string,
  storeId: string,
  idFactory: () => string,
  now: Date,
): Promise<PointRule> {
  const existing = await deps.rules.findByStoreId(merchantId, storeId);
  if (existing) return existing;
  const rule = createPointRule({
    id: idFactory(),
    merchantId,
    storeId,
    now,
  });
  await deps.rules.save(rule);
  return rule;
}

async function ensureWallet(
  deps: LoyaltyUseCaseDeps,
  input: {
    merchantId: string;
    storeId: string;
    membershipId: string;
    customerId: string;
  },
  idFactory: () => string,
  now: Date,
): Promise<Wallet> {
  const existing = await deps.wallets.findByStoreMembershipId(
    input.membershipId,
  );
  if (existing) {
    if (
      existing.merchantId !== input.merchantId ||
      existing.storeId !== input.storeId
    ) {
      throw new LoyaltyDomainError("INVALID_MEMBERSHIP");
    }
    return existing;
  }
  const wallet = createWallet({
    id: idFactory(),
    merchantId: input.merchantId,
    storeId: input.storeId,
    storeMembershipId: input.membershipId,
    customerId: input.customerId,
    now,
  });
  await deps.wallets.save(wallet);
  return wallet;
}

export function createLoyaltyUseCases(deps: LoyaltyUseCaseDeps) {
  const nowFn = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  return {
    async configurePointRule(input: ConfigurePointRuleInput): Promise<{
      rule: PointRule;
      created: boolean;
    }> {
      requireIds(input.merchantId, input.storeId);
      const at = nowFn();
      const existing = await deps.rules.findByStoreId(
        input.merchantId,
        input.storeId,
      );
      if (!existing) {
        const rule = createPointRule({
          id: idFactory(),
          merchantId: input.merchantId,
          storeId: input.storeId,
          ...(input.amountMinorPerPoint !== undefined
            ? { amountMinorPerPoint: input.amountMinorPerPoint }
            : {}),
          ...(input.pointsPerUnit !== undefined
            ? { pointsPerUnit: input.pointsPerUnit }
            : {}),
          ...(input.expiryMonthsAfterLastEarn !== undefined
            ? { expiryMonthsAfterLastEarn: input.expiryMonthsAfterLastEarn }
            : {}),
          now: at,
        });
        await deps.rules.save(rule);
        return { rule, created: true };
      }
      updatePointRule(
        existing,
        {
          ...(input.amountMinorPerPoint !== undefined
            ? { amountMinorPerPoint: input.amountMinorPerPoint }
            : {}),
          ...(input.pointsPerUnit !== undefined
            ? { pointsPerUnit: input.pointsPerUnit }
            : {}),
          ...(input.expiryMonthsAfterLastEarn !== undefined
            ? { expiryMonthsAfterLastEarn: input.expiryMonthsAfterLastEarn }
            : {}),
        },
        at,
      );
      await deps.rules.update(existing);
      return { rule: existing, created: false };
    },

    async getWallet(input: {
      membershipId: string;
      merchantId?: string;
      storeId?: string;
    }): Promise<Wallet | null> {
      if (!input.membershipId.trim()) {
        throw new LoyaltyDomainError("INVALID_MEMBERSHIP");
      }
      const wallet = await deps.wallets.findByStoreMembershipId(
        input.membershipId,
      );
      if (!wallet) return null;
      if (
        input.merchantId !== undefined &&
        wallet.merchantId !== input.merchantId
      ) {
        throw new LoyaltyDomainError("INVALID_MERCHANT");
      }
      if (input.storeId !== undefined && wallet.storeId !== input.storeId) {
        throw new LoyaltyDomainError("INVALID_STORE");
      }
      return wallet;
    },

    async earnPointsForSale(input: EarnForSaleInput): Promise<{
      wallet: Wallet;
      points: number;
      created: boolean;
      event: ReturnType<typeof pointsEarnedEvent> | null;
    }> {
      requireIds(input.merchantId, input.storeId);
      if (!input.membershipId.trim()) {
        throw new LoyaltyDomainError("INVALID_MEMBERSHIP");
      }
      if (!input.saleId.trim()) {
        throw new LoyaltyDomainError("INVALID_POINTS");
      }

      const prior = await deps.ledger.findEarnBySaleId(input.saleId);
      if (prior) {
        const wallet = await deps.wallets.findById(prior.walletId);
        if (!wallet) throw new LoyaltyDomainError("WALLET_NOT_FOUND");
        return {
          wallet,
          points: prior.points,
          created: false,
          event: null,
        };
      }

      const at = nowFn();
      const rule = await ensureRule(
        deps,
        input.merchantId,
        input.storeId,
        idFactory,
        at,
      );
      const points = calculateEarnPoints(input.totalAmountMinor, rule);
      const wallet = await ensureWallet(
        deps,
        {
          merchantId: input.merchantId,
          storeId: input.storeId,
          membershipId: input.membershipId,
          customerId: input.customerId,
        },
        idFactory,
        at,
      );

      if (points === 0) {
        return { wallet, points: 0, created: false, event: null };
      }

      creditWallet(wallet, points, at);
      await deps.wallets.update(wallet);

      const entry = createLedgerEntry({
        id: idFactory(),
        walletId: wallet.id,
        merchantId: wallet.merchantId,
        storeId: wallet.storeId,
        storeMembershipId: wallet.storeMembershipId,
        entryType: "earn",
        points,
        referenceId: input.saleId,
        referenceKind: "sale",
        now: at,
      });
      await deps.ledger.append(entry);

      const event = pointsEarnedEvent({
        walletId: wallet.id,
        merchantId: wallet.merchantId,
        storeId: wallet.storeId,
        storeMembershipId: wallet.storeMembershipId,
        customerId: wallet.customerId,
        points,
        balanceAfter: wallet.balance,
        saleId: input.saleId,
        occurredAt: at,
      });

      return { wallet, points, created: true, event };
    },

    /**
     * Earn on paid pickup — same ledger rules; wired when ordering lands (ADR-011).
     */
    async earnPointsForOrder(input: EarnForOrderInput): Promise<{
      wallet: Wallet;
      points: number;
      created: boolean;
      event: ReturnType<typeof pointsEarnedEvent> | null;
    }> {
      requireIds(input.merchantId, input.storeId);
      if (!input.membershipId.trim()) {
        throw new LoyaltyDomainError("INVALID_MEMBERSHIP");
      }

      const existingEntry = await deps.ledger.findEarnByOrderId(input.orderId);
      if (existingEntry) {
        const existingWallet = await deps.wallets.findById(existingEntry.walletId);
        if (existingWallet) {
          return { wallet: existingWallet, points: 0, created: false, event: null };
        }
      }

      const at = nowFn();
      const rule = await ensureRule(
        deps,
        input.merchantId,
        input.storeId,
        idFactory,
        at,
      );
      const points = calculateEarnPoints(BigInt(input.totalAmountMinor), rule);
      const wallet = await ensureWallet(
        deps,
        {
          merchantId: input.merchantId,
          storeId: input.storeId,
          membershipId: input.membershipId,
          customerId: input.customerId ?? input.membershipId,
        },
        idFactory,
        at,
      );

      if (points === 0) {
        return { wallet, points: 0, created: false, event: null };
      }

      creditWallet(wallet, points, at);
      await deps.wallets.update(wallet);

      const entry = createLedgerEntry({
        id: idFactory(),
        walletId: wallet.id,
        merchantId: wallet.merchantId,
        storeId: wallet.storeId,
        storeMembershipId: wallet.storeMembershipId,
        entryType: "earn",
        points,
        referenceId: input.orderId,
        referenceKind: "order",
        now: at,
      });
      await deps.ledger.append(entry);

      const event = pointsEarnedEvent({
        walletId: wallet.id,
        merchantId: wallet.merchantId,
        storeId: wallet.storeId,
        storeMembershipId: wallet.storeMembershipId,
        customerId: wallet.customerId,
        points,
        balanceAfter: wallet.balance,
        orderId: input.orderId,
        occurredAt: at,
      });

      return { wallet, points, created: true, event };
    },

    async redeemPoints(input: RedeemPointsInput): Promise<{
      wallet: Wallet;
      points: number;
      created: boolean;
      event: ReturnType<typeof pointsRedeemedEvent> | null;
    }> {
      requireIds(input.merchantId, input.storeId);
      if (!input.membershipId.trim()) {
        throw new LoyaltyDomainError("INVALID_MEMBERSHIP");
      }
      if (!Number.isInteger(input.points) || input.points < 1) {
        throw new LoyaltyDomainError("INVALID_POINTS");
      }

      if (input.referenceId?.trim()) {
        const prior = await deps.ledger.findRedeemByReferenceId(
          input.referenceId.trim(),
        );
        if (prior) {
          const wallet = await deps.wallets.findById(prior.walletId);
          if (!wallet) throw new LoyaltyDomainError("WALLET_NOT_FOUND");
          return {
            wallet,
            points: prior.points,
            created: false,
            event: null,
          };
        }
      }

      const wallet = await deps.wallets.findByStoreMembershipId(
        input.membershipId,
      );
      if (!wallet) throw new LoyaltyDomainError("WALLET_NOT_FOUND");
      if (
        wallet.merchantId !== input.merchantId ||
        wallet.storeId !== input.storeId
      ) {
        throw new LoyaltyDomainError("INVALID_MEMBERSHIP");
      }

      const at = nowFn();
      try {
        debitWallet(wallet, input.points, at);
      } catch (error) {
        if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
          throw new LoyaltyDomainError("INSUFFICIENT_BALANCE");
        }
        throw error;
      }
      await deps.wallets.update(wallet);

      const entry = createLedgerEntry({
        id: idFactory(),
        walletId: wallet.id,
        merchantId: wallet.merchantId,
        storeId: wallet.storeId,
        storeMembershipId: wallet.storeMembershipId,
        entryType: "redeem",
        points: input.points,
        referenceId: input.referenceId ?? null,
        referenceKind: "pos_redeem",
        now: at,
      });
      await deps.ledger.append(entry);

      const event = pointsRedeemedEvent({
        walletId: wallet.id,
        merchantId: wallet.merchantId,
        storeId: wallet.storeId,
        storeMembershipId: wallet.storeMembershipId,
        customerId: wallet.customerId,
        points: input.points,
        balanceAfter: wallet.balance,
        ...(input.referenceId !== undefined
          ? { referenceId: input.referenceId }
          : {}),
        occurredAt: at,
      });

      return { wallet, points: input.points, created: true, event };
    },

    /**
     * Expire stale wallets per ADR-091. Scheduler hook: `src/events/outbox` (ADR-035).
     */
    async expireStaleWallets(input: ExpireStaleWalletsInput = {}): Promise<{
      expired: Array<{
        wallet: Wallet;
        points: number;
        event: ReturnType<typeof pointsExpiredEvent>;
      }>;
    }> {
      const at = nowFn();
      const candidates = await deps.wallets.listWithPositiveBalance({
        ...(input.merchantId !== undefined
          ? { merchantId: input.merchantId }
          : {}),
        ...(input.storeId !== undefined ? { storeId: input.storeId } : {}),
        limit: input.limit ?? 100,
      });

      const expired: Array<{
        wallet: Wallet;
        points: number;
        event: ReturnType<typeof pointsExpiredEvent>;
      }> = [];

      for (const wallet of candidates) {
        const rule = await deps.rules.findByStoreId(
          wallet.merchantId,
          wallet.storeId,
        );
        if (!rule) continue;
        if (!shouldExpireWallet(wallet, rule, at)) continue;

        const points = wallet.balance;
        if (points < 1) continue;

        const lastEarnAt = wallet.lastEarnAt;
        if (!lastEarnAt) continue;

        debitWallet(wallet, points, at);
        await deps.wallets.update(wallet);

        const entry = createLedgerEntry({
          id: idFactory(),
          walletId: wallet.id,
          merchantId: wallet.merchantId,
          storeId: wallet.storeId,
          storeMembershipId: wallet.storeMembershipId,
          entryType: "expire",
          points,
          referenceId: `expiry:${at.toISOString()}`,
          referenceKind: "expiry_job",
          now: at,
        });
        await deps.ledger.append(entry);

        const event = pointsExpiredEvent({
          walletId: wallet.id,
          merchantId: wallet.merchantId,
          storeId: wallet.storeId,
          storeMembershipId: wallet.storeMembershipId,
          customerId: wallet.customerId,
          points,
          balanceAfter: wallet.balance,
          lastEarnAt: lastEarnAt.toISOString(),
          occurredAt: at,
        });

        expired.push({ wallet, points, event });
      }

      return { expired };
    },

    /** Default earn rate exposed for docs/tests. */
    defaultAmountMinorPerPoint: LOYALTY_DECISION.defaultAmountMinorPerPoint,
  };
}

export type LoyaltyUseCases = ReturnType<typeof createLoyaltyUseCases>;

/**
 * POS CompleteSale port adapter (ADR-009 ↔ ADR-010 / ADR-099).
 * Optionally enqueues PointsEarned to the transactional outbox.
 */
export function createLoyaltyEarnPort(
  useCases: Pick<LoyaltyUseCases, "earnPointsForSale">,
  options?: { outbox?: OutboxStore },
): LoyaltyEarnPort {
  return {
    async earnForSale(input) {
      const result = await useCases.earnPointsForSale({
        saleId: input.saleId,
        merchantId: input.merchantId,
        storeId: input.storeId,
        membershipId: input.membershipId,
        customerId: input.customerId,
        totalAmountMinor: input.totalAmountMinor,
      });
      if (result.event && options?.outbox) {
        await enqueueLoyaltyDomainEvent(options.outbox, result.event, {
          merchantId: result.event.payload.merchantId as string,
          storeId: result.event.payload.storeId as string,
        });
      }
    },
  };
}

export async function enqueueLoyaltyDomainEvent(
  outbox: OutboxStore,
  domainEvent: DomainEventBase & { payload: Record<string, unknown> },
  tenant: { merchantId: string; storeId: string },
): Promise<void> {
  await outbox.enqueue({
    envelope: envelopeFromDomainEvent({
      domainEvent,
      merchantId: tenant.merchantId,
      storeId: tenant.storeId,
    }),
    aggregateId: domainEvent.aggregateId,
    aggregateType: domainEvent.aggregateType,
  });
}

/**
 * ADR-099 scheduled expiry — executes expireStaleWallets and enqueues PointsExpired.
 */
export async function runLoyaltyPointsExpiryJob(input: {
  loyalty: Pick<LoyaltyUseCases, "expireStaleWallets">;
  outbox?: OutboxStore;
  merchantId?: string;
  storeId?: string;
  limit?: number;
  now?: () => Date;
}): Promise<{
  jobName: "loyalty_points_expiry";
  ranAt: string;
  status: "completed";
  expiredCount: number;
  policySnapshot: Record<string, unknown>;
}> {
  const ranAt = (input.now ?? (() => new Date()))().toISOString();
  const { expired } = await input.loyalty.expireStaleWallets({
    ...(input.merchantId !== undefined ? { merchantId: input.merchantId } : {}),
    ...(input.storeId !== undefined ? { storeId: input.storeId } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  });

  if (input.outbox) {
    for (const item of expired) {
      await enqueueLoyaltyDomainEvent(input.outbox, item.event, {
        merchantId: item.wallet.merchantId,
        storeId: item.wallet.storeId,
      });
    }
  }

  return {
    jobName: "loyalty_points_expiry",
    ranAt,
    status: "completed",
    expiredCount: expired.length,
    policySnapshot: {
      defaultMonthsAfterLastEarn:
        LOYALTY_DECISION.expiry.defaultMonthsAfterLastEarn,
      eventName: LOYALTY_DECISION.expiry.expiryEventName,
    },
  };
}
