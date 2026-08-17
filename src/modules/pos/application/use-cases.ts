import { randomUUID } from "node:crypto";

import { requireIdempotencyKey } from "../../../shared/contracts/api-standards/index.js";
import { isPosTenderType, type PosTenderType } from "../domain/sales/index.js";
import type { CartLineInput, NormalizedCart } from "../domain/cart.js";
import {
  saleCompletedEvent,
  saleCreatedEvent,
} from "../domain/events.js";
import type { SaleRepository } from "../domain/repositories.js";
import {
  createCompletedSaleAggregate,
  type Sale,
} from "../domain/sale.js";
import { PosDomainError } from "./errors.js";
import type {
  AnalyticsAfterSalePort,
  InventoryDecrementPort,
  LoyaltyEarnPort,
  MembershipUpsertPort,
  RunInUnitOfWork,
  SaleOutboxPort,
} from "./ports.js";
import { storeSaleReceiptObject } from "./store-sale-receipt.js";
import type { ObjectStoragePort } from "../../../infrastructure/minio/contracts/index.js";
import { attachSaleReceiptRef } from "../domain/sale.js";

export type PosUseCaseDeps = {
  sales: SaleRepository;
  membership: MembershipUpsertPort;
  inventory: InventoryDecrementPort;
  /** Stub until ADR-010 — optional no-op when omitted. */
  loyaltyEarn?: LoyaltyEarnPort;
  /**
   * ADR-065 — optional fire-and-forget analytics after OLTP persist.
   * Must never fail CompleteSale when Mongo / buffer is down.
   */
  analyticsAfterSale?: AnalyticsAfterSalePort;
  /** ADR-096 — persist SaleCreated / SaleCompleted to outbox after OLTP save. */
  outbox?: SaleOutboxPort;
  /**
   * ADR-126 — PostgreSQL Unit of Work for OLTP only (membership→outbox).
   * Composition binds DrizzleTransactionScope.run. Identity when omitted.
   */
  runInUnitOfWork?: RunInUnitOfWork;
  /**
   * ADR-111 — MinIO (or in-memory) object storage for receipt HTML.
   * Failures must never fail CompleteSale; outbox retries later.
   * Must run AFTER the OLTP unit of work commits.
   */
  objectStorage?: ObjectStoragePort;
  /** Optional store display name for receipt header. */
  resolveStoreDisplayName?: (input: {
    merchantId: string;
    storeId: string;
  }) => Promise<string | null>;
  now?: () => Date;
  idFactory?: () => string;
};

export type CompleteSaleInput = {
  merchantId: string;
  storeId: string;
  /** Iranian mobile — mandatory at POS (ADR-009). */
  phone: string;
  tenderType: string;
  lines: CartLineInput[];
  /** Idempotency-Key (ADR-030 / ADR-009). */
  idempotencyKey: string;
  consentNoticeVersion?: string;
};

export type CompleteSaleResult = {
  sale: Sale;
  created: boolean;
  event: ReturnType<typeof saleCompletedEvent>;
  createdEvent: ReturnType<typeof saleCreatedEvent> | null;
  membershipCreated: boolean;
};

function requireTenantIds(merchantId: string, storeId: string): {
  merchantId: string;
  storeId: string;
} {
  const m = merchantId.trim();
  const s = storeId.trim();
  if (!m) throw new PosDomainError("INVALID_MERCHANT");
  if (!s) throw new PosDomainError("INVALID_STORE");
  return { merchantId: m, storeId: s };
}

function requirePhone(raw: string): string {
  const phone = raw.trim();
  if (!phone) throw new PosDomainError("PHONE_REQUIRED");
  return phone;
}

function requireTender(raw: string): PosTenderType {
  const value = raw.trim();
  if (!isPosTenderType(value)) {
    throw new PosDomainError("INVALID_TENDER");
  }
  return value;
}

function requireIdempotency(raw: string): string {
  try {
    return requireIdempotencyKey("sale_complete", raw);
  } catch {
    throw new PosDomainError("IDEMPOTENCY_KEY_REQUIRED");
  }
}

function normalizeCart(
  merchantId: string,
  storeId: string,
  lines: CartLineInput[],
): NormalizedCart {
  if (!lines || lines.length === 0) {
    throw new PosDomainError("EMPTY_CART");
  }

  const normalized = lines.map((line) => {
    const productId = line.productId?.trim() ?? "";
    const productName = line.productName?.trim() ?? "";
    if (!productId || !productName) {
      throw new PosDomainError("INVALID_LINE");
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new PosDomainError("INVALID_QUANTITY");
    }

    let unitPriceMinor: bigint;
    try {
      unitPriceMinor =
        typeof line.unitPriceMinor === "bigint"
          ? line.unitPriceMinor
          : BigInt(line.unitPriceMinor);
    } catch {
      throw new PosDomainError("INVALID_PRICE");
    }
    if (unitPriceMinor < 0n) {
      throw new PosDomainError("INVALID_PRICE");
    }

    return {
      productId,
      productName,
      quantity: line.quantity,
      unitPriceMinor,
    };
  });

  return { merchantId, storeId, lines: normalized };
}

export function createPosUseCases(deps: PosUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  /**
   * CompleteSale (ADR-009 / ADR-126):
   * OLTP Unit of Work (same TX when Drizzle scope bound):
   *   membership → inventory(+movements) → loyalty → sale → outbox
   * After commit only:
   *   MinIO receipt (best-effort) → analytics enqueue (best-effort)
   */
  async function completeSale(
    input: CompleteSaleInput,
  ): Promise<CompleteSaleResult> {
    const { merchantId, storeId } = requireTenantIds(
      input.merchantId,
      input.storeId,
    );
    const idempotencyKey = requireIdempotency(input.idempotencyKey);
    const phone = requirePhone(input.phone);
    const tenderType = requireTender(input.tenderType);
    const cart = normalizeCart(merchantId, storeId, input.lines);
    const runUow = deps.runInUnitOfWork ?? (<T>(fn: () => Promise<T>) => fn());

    // Fail-closed: a DB UnitOfWork without outbox can orphan ERP synchronization.
    if (deps.runInUnitOfWork && !deps.outbox) {
      throw new PosDomainError("OUTBOX_REQUIRED");
    }

    type OltpResult =
      | {
          kind: "replay";
          sale: Sale;
          event: ReturnType<typeof saleCompletedEvent>;
        }
      | {
          kind: "created";
          sale: Sale;
          event: ReturnType<typeof saleCompletedEvent>;
          createdEvent: ReturnType<typeof saleCreatedEvent>;
          membershipCreated: boolean;
        };

    const toCompletedLines = (sale: Sale) =>
      sale.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitCode: "piece",
        unitPriceMinor: line.unitPriceMinor.toString(),
        lineTotalMinor: (line.unitPriceMinor * BigInt(line.quantity)).toString(),
      }));

    const oltp = await runUow(async (): Promise<OltpResult> => {
      const existing = await deps.sales.findByIdempotencyKey(
        merchantId,
        idempotencyKey,
      );
      if (existing) {
        const event = saleCompletedEvent({
          saleId: existing.id,
          merchantId: existing.merchantId,
          storeId: existing.storeId,
          membershipId: existing.membershipId,
          customerId: existing.customerId,
          phoneNational: existing.phoneNational,
          tenderType: existing.tenderType,
          totalAmountMinor: existing.totalAmountMinor.toString(),
          lineCount: existing.lines.length,
          lines: toCompletedLines(existing),
          idempotencyKey: existing.idempotencyKey,
          occurredAt: existing.completedAt ?? existing.createdAt,
        });
        if (deps.outbox?.ensureSaleCompletedEnqueued) {
          await deps.outbox.ensureSaleCompletedEnqueued({
            completedEvent: event,
            merchantId: existing.merchantId,
            storeId: existing.storeId,
          });
        }
        return { kind: "replay", sale: existing, event };
      }

      const at = now();
      const saleId = idFactory();

      const membership = await deps.membership.upsertFromPosPhoneCapture({
        merchantId,
        storeId,
        phone,
        ...(input.consentNoticeVersion !== undefined
          ? { consentNoticeVersion: input.consentNoticeVersion }
          : {}),
      });

      for (const line of cart.lines) {
        await deps.inventory.decrementForSale({
          merchantId,
          storeId,
          productId: line.productId,
          quantity: line.quantity,
          sameTransaction: true,
          saleId,
        });
      }

      const sale = createCompletedSaleAggregate({
        id: saleId,
        merchantId,
        storeId,
        membershipId: membership.membershipId,
        customerId: membership.customerId,
        phoneNational: membership.phoneNational,
        tenderType,
        lines: cart.lines.map((line) => ({
          id: idFactory(),
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
        })),
        idempotencyKey,
        now: at,
      });

      if (deps.loyaltyEarn) {
        await deps.loyaltyEarn.earnForSale({
          saleId: sale.id,
          merchantId: sale.merchantId,
          storeId: sale.storeId,
          membershipId: membership.membershipId,
          customerId: membership.customerId,
          totalAmountMinor: sale.totalAmountMinor,
        });
      }

      await deps.sales.save(sale);

      const createdEvent = saleCreatedEvent({
        saleId: sale.id,
        merchantId: sale.merchantId,
        storeId: sale.storeId,
        occurredAt: at,
      });

      const event = saleCompletedEvent({
        saleId: sale.id,
        merchantId: sale.merchantId,
        storeId: sale.storeId,
        membershipId: sale.membershipId,
        customerId: sale.customerId,
        phoneNational: sale.phoneNational,
        tenderType: sale.tenderType,
        totalAmountMinor: sale.totalAmountMinor.toString(),
        lineCount: sale.lines.length,
        lines: toCompletedLines(sale),
        idempotencyKey: sale.idempotencyKey,
        occurredAt: at,
      });

      if (deps.outbox) {
        await deps.outbox.enqueueSaleEvents({
          createdEvent,
          completedEvent: event,
          ...(membership.event ? { membershipEvent: membership.event } : {}),
          merchantId: sale.merchantId,
          storeId: sale.storeId,
        });
      }

      return {
        kind: "created",
        sale,
        event,
        createdEvent,
        membershipCreated: membership.created,
      };
    });

    if (oltp.kind === "replay") {
      return {
        sale: oltp.sale,
        created: false,
        event: oltp.event,
        createdEvent: null,
        membershipCreated: false,
      };
    }

    const { sale, event, createdEvent, membershipCreated } = oltp;

    // ADR-111: after OLTP commit — never fail CompleteSale when MinIO down.
    if (deps.objectStorage) {
      try {
        let storeDisplayName: string | null = null;
        if (deps.resolveStoreDisplayName) {
          storeDisplayName = await deps.resolveStoreDisplayName({
            merchantId: sale.merchantId,
            storeId: sale.storeId,
          });
        }
        const stored = await storeSaleReceiptObject({
          storage: deps.objectStorage,
          sale,
          storeDisplayName,
        });
        attachSaleReceiptRef(sale, {
          objectKey: stored.objectKey,
          contentType: stored.receiptRef.contentType,
        });
        await deps.sales.updateReceiptRef(sale.id, {
          objectKey: stored.objectKey,
          contentType: stored.receiptRef.contentType,
        });
      } catch {
        // Isolation belt — receipt retry via SaleCompleted outbox consumer.
      }
    }

    // ADR-065: analytics after OLTP commit only; never fail CompleteSale.
    if (deps.analyticsAfterSale) {
      try {
        await deps.analyticsAfterSale.enqueueSaleCompleted({
          eventId: idFactory(),
          saleId: sale.id,
          merchantId: sale.merchantId,
          storeId: sale.storeId,
          occurredAt: sale.completedAt ?? sale.createdAt,
          payload: { ...event.payload },
        });
      } catch {
        // Isolation belt — SaleCompleted OLTP result remains successful.
      }
    }

    return {
      sale,
      created: true,
      event,
      createdEvent,
      membershipCreated,
    };
  }

  return { completeSale };
}

export type PosUseCases = ReturnType<typeof createPosUseCases>;
