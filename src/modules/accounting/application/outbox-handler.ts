/**
 * Outbox consumer → AccountingProvider (ADR-126).
 * Idempotency is enforced by processed_events in the outbox worker;
 * provider also dedupes by eventId (Fake/future ERPNext).
 */

import type { OutboxMessage } from "../../../outbox/index.js";
import {
  mapCustomerToAccountingSync,
  mapExpenseToAccountingRecord,
  mapPaymentToAccountingRecord,
  mapProductToAccountingSync,
  mapPurchaseToAccountingRecord,
  mapReturnToAccountingRecord,
  mapSaleToAccountingRecord,
  mapSupplierToAccountingSync,
  mapTransferToAccountingRecord,
} from "./mappers/index.js";
import {
  INTEGRATION_METRIC_NAMES,
  recordIntegrationMetric,
} from "./observability.js";
import type { ExternalEntityMappingRepository } from "../domain/external-entity-mapping.js";
import type { ErpNextSyncRecordRepository } from "../../erpnext/domain/sync-record.js";
import type { AccountingProvider } from "./ports/accounting-provider.js";
import {
  markSyncFailed,
  markSyncPending,
  markSyncSynced,
} from "../../erpnext/application/sync-lifecycle.js";

export type AccountingOutboxHandlerDeps = {
  provider: AccountingProvider;
  mappings?: ExternalEntityMappingRepository;
  syncRecords?: ErpNextSyncRecordRepository;
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

      const trackEntity = async (
        type: string,
        id: string,
      ): Promise<void> => {
        if (!deps.syncRecords) return;
        await markSyncPending({
          repo: deps.syncRecords,
          merchantId: message.merchantId,
          storeId: message.storeId,
          entityType: type,
          entityId: id,
          eventId: message.eventId,
          idFactory,
          now,
        });
      };

      switch (message.eventType) {
        case "SaleCompleted": {
          const saleId = String(payload.saleId ?? message.aggregateId ?? "");
          await trackEntity("sale", saleId);
          const customerId =
            payload.customerId != null ? String(payload.customerId) : "";
          if (customerId) {
            await deps.provider.syncCustomer(
              mapCustomerToAccountingSync({
                eventId: `${message.eventId}:customer`,
                merchantId: message.merchantId,
                storeId: message.storeId,
                customerId,
                phoneNational:
                  payload.phoneNational != null
                    ? String(payload.phoneNational)
                    : null,
              }),
            );
          }
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
          await trackEntity("order", orderId);
          const linesRaw = Array.isArray(payload.lines) ? payload.lines : [];
          const lines = linesRaw.map((line) => {
            const row = line as Record<string, unknown>;
            return {
              productId: String(row.productId ?? ""),
              quantity: Number(row.quantity ?? 0),
              unitCode: String(row.unitCode ?? "piece"),
              unitPriceMinor: String(row.unitPriceMinor ?? "0"),
              lineTotalMinor: String(row.lineTotalMinor ?? "0"),
            };
          });
          if (lines.length === 0) {
            throw new Error(
              "OrderPaid requires lines for ERPNext Sales Invoice projection",
            );
          }
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
              lines,
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
          await trackEntity("payment", paymentId);
          const result = await deps.provider.recordPayment(
            mapPaymentToAccountingRecord({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId,
              paymentId,
              orderId: String(payload.orderId ?? ""),
              amountMinor: String(payload.amountMinor ?? "0"),
              providerRef:
                payload.providerRef != null
                  ? String(payload.providerRef)
                  : null,
              occurredAt: message.occurredAt,
            }),
          );
          resultExternalId = result.externalId;
          entityType = "payment";
          entityId = paymentId;
          break;
        }
        case "ProductCreated":
        case "ProductUpdated":
        case "ProductDeleted": {
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
              disabled: message.eventType === "ProductDeleted",
            }),
          );
          resultExternalId = result.externalId;
          entityType = "product";
          entityId = productId;
          break;
        }
        case "CustomerCreated":
        case "MembershipCreated":
        case "MembershipUpdated": {
          // CRM SoT is membership; accounting party projection uses customerId.
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
              displayName:
                payload.displayName != null
                  ? String(payload.displayName)
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
        case "PurchaseCreated":
        case "PurchaseCompleted": {
          const purchaseId = String(
            payload.purchaseId ?? message.aggregateId ?? "",
          );
          await trackEntity("purchase", purchaseId);
          const linesRaw = Array.isArray(payload.items ?? payload.lines)
            ? ((payload.items ?? payload.lines) as unknown[])
            : [];
          const lines = linesRaw.map((line) => {
            const row = line as Record<string, unknown>;
            return {
              productId: String(row.productId ?? ""),
              quantity: Number(row.quantity ?? row.qty ?? 0),
              unitCode: String(row.unitCode ?? "piece"),
              unitCostMinor: String(row.unitCostMinor ?? row.rateMinor ?? "0"),
              lineTotalMinor: String(
                row.lineTotalMinor ?? row.totalMinor ?? "0",
              ),
              itemCode: row.itemCode ? String(row.itemCode) : undefined,
            };
          });
          const supplierName = String(
            payload.supplierName ?? payload.supplierId ?? "Supplier",
          );
          const result = await deps.provider.recordPurchase(
            mapPurchaseToAccountingRecord({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId,
              purchaseId,
              supplierName,
              supplierId:
                payload.supplierId != null
                  ? String(payload.supplierId)
                  : null,
              idempotencyKey: String(payload.idempotencyKey ?? purchaseId),
              invoiceNumber:
                payload.invoiceNumber != null
                  ? String(payload.invoiceNumber)
                  : null,
              postingDate: String(
                payload.purchaseDate ??
                  payload.postingDate ??
                  message.occurredAt,
              ),
              dueDate:
                payload.dueDate != null ? String(payload.dueDate) : null,
              totalAmountMinor: String(
                payload.totalAmountMinor ?? payload.totalMinor ?? "0",
              ),
              currency: "IRR",
              remarks:
                payload.notes != null ? String(payload.notes) : undefined,
              lines,
            }),
          );
          resultExternalId = result.externalId;
          entityType = "purchase";
          entityId = purchaseId;
          break;
        }
        case "SaleReturned":
        case "ReturnCompleted":
        case "CustomerReturnProcessed": {
          const returnId = String(
            payload.returnId ?? message.aggregateId ?? "",
          );
          await trackEntity("return", returnId);
          const linesRaw = Array.isArray(payload.items ?? payload.lines)
            ? ((payload.items ?? payload.lines) as unknown[])
            : [];
          const lines = linesRaw.map((line) => {
            const row = line as Record<string, unknown>;
            return {
              productId: String(row.productId ?? ""),
              quantity: Number(row.quantity ?? row.qty ?? 0),
              unitCode: String(row.unitCode ?? "piece"),
              unitPriceMinor: String(
                row.unitPriceMinor ?? row.rateMinor ?? "0",
              ),
              lineTotalMinor: String(
                row.lineTotalMinor ?? row.totalMinor ?? "0",
              ),
              itemCode: row.itemCode ? String(row.itemCode) : undefined,
            };
          });
          const result = await deps.provider.recordReturn(
            mapReturnToAccountingRecord({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId,
              returnId,
              originalSaleOrOrderId: String(
                payload.saleId ??
                  payload.originalReferenceId ??
                  payload.orderId ??
                  "",
              ),
              idempotencyKey: String(payload.idempotencyKey ?? returnId),
              returnNumber:
                payload.returnNumber != null
                  ? String(payload.returnNumber)
                  : undefined,
              customerName:
                payload.customerName != null
                  ? String(payload.customerName)
                  : undefined,
              customerId:
                payload.customerId != null
                  ? String(payload.customerId)
                  : null,
              totalAmountMinor: String(
                payload.totalAmountMinor ?? payload.totalMinor ?? "0",
              ),
              currency: "IRR",
              reason:
                payload.reason != null ? String(payload.reason) : undefined,
              occurredAt: message.occurredAt,
              lines,
            }),
          );
          resultExternalId = result.externalId;
          entityType = "return";
          entityId = returnId;
          break;
        }
        case "ExpenseRecorded":
        case "ExpenseCreated": {
          const expenseId = String(
            payload.expenseId ?? message.aggregateId ?? "",
          );
          await trackEntity("expense", expenseId);
          const result = await deps.provider.recordExpense(
            mapExpenseToAccountingRecord({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId,
              expenseId,
              categoryId:
                payload.categoryId != null
                  ? String(payload.categoryId)
                  : null,
              categoryName:
                payload.categoryName != null
                  ? String(payload.categoryName)
                  : null,
              amountMinor: String(payload.amountMinor ?? "0"),
              currency: "IRR",
              paymentMethod:
                payload.paymentMethod != null
                  ? String(payload.paymentMethod)
                  : "cash",
              expenseDate: String(
                payload.expenseDate ?? message.occurredAt,
              ),
              description:
                payload.description != null
                  ? String(payload.description)
                  : null,
              accountId:
                payload.accountId != null ? String(payload.accountId) : null,
            }),
          );
          resultExternalId = result.externalId;
          entityType = "expense";
          entityId = expenseId;
          break;
        }
        case "StockTransferred":
        case "TransferCompleted": {
          const transferId = String(
            payload.transferId ?? message.aggregateId ?? "",
          );
          await trackEntity("stock_transfer", transferId);
          const linesRaw = Array.isArray(payload.items ?? payload.lines)
            ? ((payload.items ?? payload.lines) as unknown[])
            : [];
          const lines = linesRaw.map((line) => {
            const row = line as Record<string, unknown>;
            return {
              productId: String(row.productId ?? ""),
              quantity: Number(row.quantity ?? row.qty ?? 0),
              unitCode: String(row.unitCode ?? "piece"),
              itemCode: row.itemCode ? String(row.itemCode) : undefined,
            };
          });
          const result = await deps.provider.recordTransfer(
            mapTransferToAccountingRecord({
              eventId: message.eventId,
              merchantId: message.merchantId,
              fromStoreId: String(
                payload.fromStoreId ?? message.storeId ?? "",
              ),
              toStoreId: String(payload.toStoreId ?? ""),
              transferId,
              occurredAt: message.occurredAt,
              remarks:
                payload.notes != null ? String(payload.notes) : undefined,
              lines,
            }),
          );
          resultExternalId = result.externalId;
          entityType = "stock_transfer";
          entityId = transferId;
          break;
        }
        case "SupplierCreated":
        case "SupplierUpdated": {
          const supplierId = String(
            payload.supplierId ?? message.aggregateId ?? "",
          );
          await trackEntity("supplier", supplierId);
          const result = await deps.provider.syncSupplier(
            mapSupplierToAccountingSync({
              eventId: message.eventId,
              merchantId: message.merchantId,
              storeId: message.storeId,
              supplierId,
              name: String(payload.name ?? ""),
              phone:
                payload.phone != null ? String(payload.phone) : null,
              taxId:
                payload.taxId != null ? String(payload.taxId) : null,
              supplierGroup:
                payload.supplierGroup != null
                  ? String(payload.supplierGroup)
                  : null,
              address:
                payload.address != null ? String(payload.address) : null,
            }),
          );
          resultExternalId = result.externalId;
          entityType = "supplier";
          entityId = supplierId;
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

      if (deps.syncRecords && entityType && entityId) {
        await markSyncSynced({
          repo: deps.syncRecords,
          merchantId: message.merchantId,
          storeId: message.storeId,
          entityType,
          entityId,
          eventId: message.eventId,
          erpnextId: resultExternalId,
          idFactory,
          now,
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
      if (deps.syncRecords) {
        const fallbackType =
          message.eventType === "SaleCompleted"
            ? "sale"
            : message.eventType === "OrderPaid"
              ? "order"
              : message.eventType === "PaymentSucceeded"
                ? "payment"
                : message.eventType.startsWith("Product")
                  ? "product"
                  : message.eventType.includes("Membership") ||
                      message.eventType === "CustomerCreated"
                    ? "customer"
                    : message.eventType.includes("Purchase")
                      ? "purchase"
                      : message.eventType.includes("Return")
                        ? "return"
                        : message.eventType.includes("Expense")
                          ? "expense"
                          : message.eventType.includes("Transfer")
                            ? "stock_transfer"
                            : message.eventType.includes("Supplier")
                              ? "supplier"
                              : "unknown";
        const fallbackId = String(message.aggregateId ?? "unknown");
        await markSyncFailed({
          repo: deps.syncRecords,
          merchantId: message.merchantId,
          storeId: message.storeId,
          entityType: fallbackType,
          entityId: fallbackId,
          eventId: message.eventId,
          error: err,
          idFactory,
          now,
        });
      }
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
