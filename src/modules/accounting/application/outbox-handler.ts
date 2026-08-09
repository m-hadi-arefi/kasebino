/**
 * Outbox consumer → AccountingProvider (ADR-126).
 * Idempotency is enforced by processed_events in the outbox worker;
 * provider also dedupes by eventId (Fake/future ERPNext).
 */

import type { OutboxMessage } from "../../../outbox/index.js";
import type { AccountingProvider } from "./ports/accounting-provider.js";
import {
  mapCustomerToAccountingSync,
  mapProductToAccountingSync,
  mapSaleToAccountingRecord,
} from "./mappers/index.js";
import {
  INTEGRATION_METRIC_NAMES,
  recordIntegrationMetric,
} from "./observability.js";
import type { ExternalEntityMappingRepository } from "../domain/external-entity-mapping.js";

export type AccountingOutboxHandlerDeps = {
  provider: AccountingProvider;
  mappings?: ExternalEntityMappingRepository;
  now?: () => Date;
  idFactory?: () => string;
};

function payloadOf(message: OutboxMessage): Record<string, unknown> {
  const env = message.envelope as {
    payload?: Record<string, unknown>;
  };
  return env.payload ?? {};
}

export function createAccountingOutboxHandler(deps: AccountingOutboxHandlerDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => crypto.randomUUID());

  return async function accountingIntegrationHandler(
    message: OutboxMessage,
  ): Promise<void> {
    const payload = payloadOf(message);
    const attempt = message.attemptCount + 1;
    recordIntegrationMetric(INTEGRATION_METRIC_NAMES.processing, {
      merchant_id: message.merchantId,
      store_id: message.storeId,
      event_id: message.eventId,
      entity_id: message.aggregateId,
      event_type: message.eventType,
      provider: deps.provider.providerId,
      attempt,
    });

    try {
      let resultExternalId: string | null = null;
      let entityType: string | null = null;
      let entityId: string | null = message.aggregateId;

      switch (message.eventType) {
        case "SaleCompleted": {
          const saleId = String(payload.saleId ?? message.aggregateId ?? "");
          const linesRaw = Array.isArray(payload.lines) ? payload.lines : [];
          const lines =
            linesRaw.length > 0
              ? linesRaw.map((line) => {
                  const row = line as Record<string, unknown>;
                  return {
                    productId: String(row.productId ?? ""),
                    quantity: Number(row.quantity ?? 0),
                    unitCode: String(row.unitCode ?? "piece"),
                    unitPriceMinor: String(row.unitPriceMinor ?? "0"),
                    lineTotalMinor: String(row.lineTotalMinor ?? "0"),
                  };
                })
              : [
                  {
                    productId: "unknown",
                    quantity: Number(payload.lineCount ?? 0),
                    unitCode: "piece",
                    unitPriceMinor: "0",
                    lineTotalMinor: String(payload.totalAmountMinor ?? "0"),
                  },
                ];
          const result = await deps.provider.recordSale(
            mapSaleToAccountingRecord({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId ?? "",
              saleId,
              idempotencyKey: String(payload.idempotencyKey ?? saleId),
              channel: "pos",
              tenderType:
                payload.tenderType != null ? String(payload.tenderType) : null,
              totalAmountMinor: String(payload.totalAmountMinor ?? "0"),
              occurredAt: message.occurredAt,
              lines,
            }),
          );
          resultExternalId = result.externalId;
          entityType = "sale";
          entityId = saleId;
          break;
        }
        case "OrderPaid": {
          const orderId = String(payload.orderId ?? message.aggregateId ?? "");
          const result = await deps.provider.recordSale(
            mapSaleToAccountingRecord({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId ?? "",
              saleId: orderId,
              idempotencyKey: String(payload.idempotencyKey ?? orderId),
              channel: "online",
              totalAmountMinor: String(
                payload.totalAmountMinor ?? payload.amountMinor ?? "0",
              ),
              occurredAt: message.occurredAt,
              lines: [],
            }),
          );
          resultExternalId = result.externalId;
          entityType = "order";
          entityId = orderId;
          break;
        }
        case "PaymentSucceeded": {
          const paymentId = String(
            payload.paymentId ?? message.aggregateId ?? "",
          );
          const result = await deps.provider.recordPayment({
            eventId: message.eventId,
            merchantId: message.merchantId,
            storeId: message.storeId,
            entityType: "payment",
            entityId: paymentId,
            paymentId,
            orderId: String(payload.orderId ?? ""),
            amountMinor: String(payload.amountMinor ?? "0"),
            currency: "IRR",
            providerRef:
              payload.providerRef != null ? String(payload.providerRef) : null,
            occurredAt: message.occurredAt.toISOString(),
          });
          resultExternalId = result.externalId;
          entityType = "payment";
          entityId = paymentId;
          break;
        }
        case "ProductCreated":
        case "ProductUpdated": {
          const productId = String(
            payload.productId ?? message.aggregateId ?? "",
          );
          const result = await deps.provider.syncProduct(
            mapProductToAccountingSync({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId,
              productId,
              sku: String(payload.sku ?? ""),
              barcode: String(payload.barcode ?? ""),
              name: String(payload.name ?? ""),
              unitCode: String(payload.unitCode ?? payload.baseUnitCode ?? "piece"),
              priceAmountMinor: String(payload.priceAmountMinor ?? "0"),
            }),
          );
          resultExternalId = result.externalId;
          entityType = "product";
          entityId = productId;
          break;
        }
        case "CustomerCreated": {
          const customerId = String(
            payload.customerId ?? message.aggregateId ?? "",
          );
          const result = await deps.provider.syncCustomer(
            mapCustomerToAccountingSync({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId,
              customerId,
              phoneNational:
                payload.phoneNational != null
                  ? String(payload.phoneNational)
                  : null,
            }),
          );
          resultExternalId = result.externalId;
          entityType = "customer";
          entityId = customerId;
          break;
        }
        case "StockAdjusted": {
          const productId = String(payload.productId ?? "");
          const result = await deps.provider.recordInventoryAdjustment({
            eventId: message.eventId,
            merchantId: message.merchantId,
            storeId: message.storeId,
            entityType: "stock_adjustment",
            entityId: String(message.aggregateId ?? productId),
            productId,
            quantityDelta: Number(payload.delta ?? payload.quantityDelta ?? 0),
            unitCode: String(payload.unitCode ?? "piece"),
            reason: String(payload.reason ?? "adjustment"),
            referenceType:
              payload.referenceType != null
                ? String(payload.referenceType)
                : null,
            referenceId:
              payload.referenceId != null ? String(payload.referenceId) : null,
            occurredAt: message.occurredAt.toISOString(),
          });
          resultExternalId = result.externalId;
          entityType = "stock_adjustment";
          entityId = String(message.aggregateId ?? productId);
          break;
        }
        default:
          // Ignore unrelated events on the shared outbox spine.
          return;
      }

      if (
        deps.mappings &&
        resultExternalId &&
        entityType &&
        entityId
      ) {
        const at = now();
        await deps.mappings.upsert({
          id: idFactory(),
          merchantId: message.merchantId,
          storeId: message.storeId,
          entityType,
          entityId,
          provider: deps.provider.providerId,
          externalId: resultExternalId,
          externalSecondaryId: null,
          createdAt: at,
          updatedAt: at,
        });
      }

      recordIntegrationMetric(INTEGRATION_METRIC_NAMES.success, {
        merchant_id: message.merchantId,
        store_id: message.storeId,
        event_id: message.eventId,
        entity_id: entityId,
        event_type: message.eventType,
        provider: deps.provider.providerId,
        attempt,
      });
    } catch (err) {
      recordIntegrationMetric(INTEGRATION_METRIC_NAMES.failed, {
        merchant_id: message.merchantId,
        store_id: message.storeId,
        event_id: message.eventId,
        entity_id: message.aggregateId,
        event_type: message.eventType,
        provider: deps.provider.providerId,
        attempt,
      });
      throw err;
    }
  };
}
