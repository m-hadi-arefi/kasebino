/**
 * DocType projectors — AccountingProvider DTOs → ERPNext documents (ADR-137/140).
 */

import type {
  RecordInventoryAdjustmentInput,
  RecordPaymentInput,
  RecordSaleInput,
  SyncCustomerInput,
  SyncProductInput,
} from "../../../application/ports/accounting-provider.js";
import type { ErpNextProviderConfig } from "./erpnext-config.js";
import { minorToErpRate, mosEventMarker } from "./erpnext-client.js";

export function mapUnitCodeToStockUom(unitCode: string): string {
  switch (unitCode) {
    case "kg":
      return "Kg";
    case "g":
      return "Gram";
    case "piece":
    default:
      return "Nos";
  }
}

export function customerDocName(customerId: string): string {
  return `MOS-${customerId}`;
}

export function projectItemDoc(
  input: SyncProductInput,
  config: ErpNextProviderConfig,
  opts?: { disabled?: boolean },
): Record<string, unknown> {
  const itemCode = input.sku || input.entityId;
  const doc: Record<string, unknown> = {
    doctype: "Item",
    item_code: itemCode,
    item_name: input.name,
    item_group: config.itemGroup,
    stock_uom: mapUnitCodeToStockUom(input.unitCode),
    is_stock_item: 1,
    is_sales_item: 1,
    disabled: opts?.disabled ? 1 : 0,
    description: `MerchantOS product ${input.entityId}`,
  };
  if (input.priceAmountMinor) {
    const rate = minorToErpRate(input.priceAmountMinor);
    doc.valuation_rate = rate;
    doc.standard_rate = rate;
  }
  if (input.barcode) {
    doc.barcodes = [{ barcode: input.barcode, barcode_type: "" }];
  }
  return doc;
}

export function projectCustomerDoc(
  input: SyncCustomerInput,
  config: ErpNextProviderConfig,
): Record<string, unknown> {
  const label = customerDocName(input.entityId);
  return {
    doctype: "Customer",
    customer_name: input.displayName?.trim() || label,
    customer_type: "Individual",
    customer_group: config.customerGroup,
    territory: config.territory,
    mobile_no: input.phoneNational ?? undefined,
    customer_details: `${label} ${mosEventMarker(input.eventId)}`,
  };
}

export function projectSalesInvoiceDoc(
  input: RecordSaleInput,
  config: ErpNextProviderConfig,
  resolved: {
    customerName: string;
    itemCodesByProductId: ReadonlyMap<string, string>;
  },
): Record<string, unknown> {
  const updateStock = input.channel === "pos" ? 1 : 0;
  const items = input.lines.map((line, idx) => {
    const itemCode =
      resolved.itemCodesByProductId.get(line.productId) ?? line.productId;
    const row: Record<string, unknown> = {
      item_code: itemCode,
      qty: line.quantity,
      rate: minorToErpRate(line.unitPriceMinor),
      uom: mapUnitCodeToStockUom(line.unitCode),
      allow_zero_valuation_rate: 1,
      idx: idx + 1,
    };
    if (updateStock) {
      row.warehouse = config.warehouse;
    }
    if (config.incomeAccount) {
      row.income_account = config.incomeAccount;
    }
    if (config.costCenter) {
      row.cost_center = config.costCenter;
    }
    return row;
  });

  const doc: Record<string, unknown> = {
    doctype: "Sales Invoice",
    company: config.company,
    customer: resolved.customerName,
    posting_date: input.occurredAt.slice(0, 10),
    currency: input.currency || config.currency,
    update_stock: updateStock,
    items,
    po_no: input.saleId,
    remarks: `${mosEventMarker(input.eventId)} channel=${input.channel}`,
    is_pos: input.channel === "pos" ? 1 : 0,
  };

  if (input.channel === "pos" && input.tenderType) {
    const mode =
      input.tenderType === "card_terminal" ? "Card" : "Cash";
    doc.payments = [
      {
        mode_of_payment: mode,
        amount: minorToErpRate(input.totalAmountMinor),
        ...(config.cashAccount && mode === "Cash"
          ? { account: config.cashAccount }
          : {}),
      },
    ];
  }

  return doc;
}

export function projectPaymentEntryDoc(
  input: RecordPaymentInput,
  config: ErpNextProviderConfig,
  resolved: { customerName: string; invoiceName?: string | null },
): Record<string, unknown> {
  const amount = minorToErpRate(input.amountMinor);
  const doc: Record<string, unknown> = {
    doctype: "Payment Entry",
    payment_type: "Receive",
    company: config.company,
    party_type: "Customer",
    party: resolved.customerName,
    paid_amount: amount,
    received_amount: amount,
    posting_date: input.occurredAt.slice(0, 10),
    reference_no: input.providerRef ?? input.paymentId,
    reference_date: input.occurredAt.slice(0, 10),
    remarks: mosEventMarker(input.eventId),
  };
  if (config.cashAccount) {
    doc.paid_to = config.cashAccount;
  }
  if (resolved.invoiceName) {
    doc.references = [
      {
        reference_doctype: "Sales Invoice",
        reference_name: resolved.invoiceName,
        allocated_amount: amount,
      },
    ];
  }
  return doc;
}

export function projectStockEntryDoc(
  input: RecordInventoryAdjustmentInput,
  config: ErpNextProviderConfig,
  itemCode: string,
): Record<string, unknown> {
  const qty = Math.abs(input.quantityDelta);
  const isReceipt = input.quantityDelta > 0;
  const row: Record<string, unknown> = {
    item_code: itemCode,
    qty,
    uom: mapUnitCodeToStockUom(input.unitCode),
    transfer_qty: qty,
    conversion_factor: 1,
  };
  if (isReceipt) {
    row.t_warehouse = config.warehouse;
  } else {
    row.s_warehouse = config.warehouse;
  }
  return {
    doctype: "Stock Entry",
    company: config.company,
    stock_entry_type: isReceipt ? "Material Receipt" : "Material Issue",
    posting_date: input.occurredAt.slice(0, 10),
    remarks: `${mosEventMarker(input.eventId)} reason=${input.reason}`,
    items: [row],
  };
}
