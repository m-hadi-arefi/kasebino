/**
 * ERPNext Purchasing & Supplier Provider (ADR-141 / Phase 8 / Step 6).
 * Handles Supplier master sync, Purchase Invoices, Purchase Receipts, and Accounts Payable.
 */

import type { ErpNextClient } from "./erpnext-client.js";
import type { TenantContext } from "./tenant-resolver.js";

export type SyncSupplierInput = {
  entityId: string;
  name: string;
  taxId?: string;
  phone?: string;
  supplierGroup?: string;
};

export type RecordPurchaseInvoiceInput = {
  merchantId: string;
  storeId?: string;
  purchaseId: string;
  supplierName: string;
  postingDate: string;
  dueDate?: string;
  items: Array<{
    productId: string;
    itemCode?: string;
    qty: number;
    rateMinor: number;
  }>;
  remarks?: string;
};

export class ErpNextPurchasingProvider {
  /**
   * Sync or create Supplier in ERPNext.
   */
  async syncSupplier(
    client: ErpNextClient,
    tenant: TenantContext,
    input: SyncSupplierInput,
  ): Promise<{ ok: boolean; externalId: string }> {
    const supplierName = input.name.trim();
    const existing = await client.getList("Supplier", {
      fields: ["name"],
      filters: [
        ["supplier_name", "=", supplierName],
      ],
      limit: 1,
    });

    if (existing[0]?.name) {
      const name = String(existing[0].name);
      if (input.phone || input.taxId) {
        await client.updateDoc("Supplier", name, {
          mobile_no: input.phone || undefined,
          tax_id: input.taxId || undefined,
        });
      }
      return { ok: true, externalId: name };
    }

    const created = await client.createDoc("Supplier", {
      supplier_name: supplierName,
      supplier_group: input.supplierGroup || "All Supplier Groups",
      supplier_type: "Company",
      mobile_no: input.phone || undefined,
      tax_id: input.taxId || undefined,
    });

    return { ok: true, externalId: String(created.name ?? supplierName) };
  }

  /**
   * Record and submit a Purchase Invoice in ERPNext.
   */
  async recordPurchaseInvoice(
    client: ErpNextClient,
    tenant: TenantContext,
    input: RecordPurchaseInvoiceInput,
  ): Promise<{ ok: boolean; externalId: string }> {
    const warehouse = tenant.storeWarehouse || tenant.defaultWarehouse;

    // Ensure Supplier exists
    await this.syncSupplier(client, tenant, {
      entityId: input.supplierName,
      name: input.supplierName,
    });

    const itemsDoc = input.items.map((item) => ({
      item_code: item.itemCode || item.productId,
      qty: item.qty,
      rate: Number(item.rateMinor) / 10, // minor units conversion
      warehouse,
    }));

    const draft = await client.createDoc("Purchase Invoice", {
      company: tenant.erpnextCompany,
      supplier: input.supplierName,
      posting_date: input.postingDate,
      due_date: input.dueDate || input.postingDate,
      currency: "IRR",
      update_stock: 1,
      items: itemsDoc,
      remarks: input.remarks || `Purchase Invoice from Kasbino (${input.purchaseId})`,
    });

    const draftName = String(draft.name);
    const submitted = await client.submitDoc("Purchase Invoice", draftName);

    return { ok: true, externalId: String(submitted.name ?? draftName) };
  }

  /**
   * List Purchase Invoices for tenant company.
   */
  async listPurchaseInvoices(
    client: ErpNextClient,
    tenant: TenantContext,
    limit = 50,
  ) {
    const rows = await client.getList("Purchase Invoice", {
      fields: [
        "name",
        "supplier",
        "posting_date",
        "grand_total",
        "outstanding_amount",
        "status",
        "docstatus",
      ],
      filters: [["company", "=", tenant.erpnextCompany]],
      limit,
    });

    return rows.map((row) => ({
      invoiceNo: String(row.name),
      supplier: String(row.supplier ?? ""),
      postingDate: String(row.posting_date ?? ""),
      grandTotal: Number(row.grand_total ?? 0),
      outstandingAmount: Number(row.outstanding_amount ?? 0),
      status: String(row.status ?? ""),
      isSubmitted: row.docstatus === 1,
    }));
  }
}
