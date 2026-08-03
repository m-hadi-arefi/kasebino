import { randomUUID } from "node:crypto";

import { requireIdempotencyKey } from "../../../api-standards/index.js";
import { isPosTenderType, type PosTenderType } from "../../../pos-sales/index.js";
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
} from "./ports.js";

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
   * CompleteSale unit of work (ADR-009):
   * 1. Idempotency replay
   * 2. Validate cart + tender + phone
   * 3. Membership upsert port (POS notice-continue consent)
   * 4. Inventory decrement port (same TX flag)
   * 5. Loyalty earn port (ADR-010 createLoyaltyEarnPort)
   * 6. Persist Sale + emit SaleCompleted
   */
  async function completeSale(
    input: CompleteSaleInput,
  ): Promise<CompleteSaleResult> {
    const { merchantId, storeId } = requireTenantIds(
      input.merchantId,
      input.storeId,
    );
    const idempotencyKey = requireIdempotency(input.idempotencyKey);

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
        idempotencyKey: existing.idempotencyKey,
        occurredAt: existing.completedAt ?? existing.createdAt,
      });
      return {
        sale: existing,
        created: false,
        event,
        createdEvent: null,
        membershipCreated: false,
      };
    }

    const phone = requirePhone(input.phone);
    const tenderType = requireTender(input.tenderType);
    const cart = normalizeCart(merchantId, storeId, input.lines);
    const at = now();

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
      });
    }

    const saleId = idFactory();
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
      idempotencyKey: sale.idempotencyKey,
      occurredAt: at,
    });

    // ADR-065: analytics after OLTP commit only; never fail CompleteSale.
    if (deps.analyticsAfterSale) {
      try {
        await deps.analyticsAfterSale.enqueueSaleCompleted({
          eventId: idFactory(),
          saleId: sale.id,
          merchantId: sale.merchantId,
          storeId: sale.storeId,
          occurredAt: at,
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
      membershipCreated: membership.created,
    };
  }

  return { completeSale };
}

export type PosUseCases = ReturnType<typeof createPosUseCases>;
