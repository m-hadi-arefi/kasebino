import type { OutboxDispatchHandler, OutboxMessage } from "../../../outbox/index.js";
import type { createLoyaltyUseCases } from "./use-cases.js";

export type LoyaltyOutboxHandlerOptions = {
  useCases: ReturnType<typeof createLoyaltyUseCases>;
};

export function createLoyaltyOutboxHandler(
  options: LoyaltyOutboxHandlerOptions,
): OutboxDispatchHandler {
  return async (message: OutboxMessage): Promise<void> => {
    const eventType = message.envelope?.eventType ?? message.eventType;
    if (eventType === "OrderPaid") {
      const payload = (message.envelope?.payload ?? message.payload) as Record<string, unknown>;
      const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
      const merchantId = typeof payload.merchantId === "string" ? payload.merchantId : message.merchantId;
      const storeId = typeof payload.storeId === "string" ? payload.storeId : (message.storeId ?? "");
      const membershipId = typeof payload.membershipId === "string" ? payload.membershipId : "";
      const customerId = typeof payload.customerId === "string" ? payload.customerId : undefined;
      const totalAmountMinorRaw = payload.totalAmountMinor;
      const totalAmountMinor =
        typeof totalAmountMinorRaw === "bigint"
          ? totalAmountMinorRaw
          : BigInt(totalAmountMinorRaw ?? 0);

      if (orderId && merchantId && storeId && membershipId.trim()) {
        await options.useCases.earnPointsForOrder({
          merchantId,
          storeId,
          orderId,
          membershipId,
          customerId,
          totalAmountMinor,
        });
      }
    }
  };
}
