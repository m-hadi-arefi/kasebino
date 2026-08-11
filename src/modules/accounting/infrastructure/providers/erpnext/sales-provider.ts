/**
 * ERPNext Sales Provider (ADR-141 / Phase 7 / Step 5).
 * Full lifecycle management for Sales Invoices, Credit Notes/Returns, and Sales Orders.
 */

import type { ErpNextClient } from "./erpnext-client.js";
import type { TenantContext } from "./tenant-resolver.js";

export type CreateReturnInput = {
  invoiceNo: string;
  reason?: string;
  items?: Array<{
    itemCode: string;
    qty: number;
  }>;
};

export class ErpNextSalesProvider {
  /**
   * Create a Credit Note / Sales Return against an existing Sales Invoice.
   */
  async createReturnInvoice(
    client: ErpNextClient,
    tenant: TenantContext,
    input: CreateReturnInput,
  ): Promise<{ ok: boolean; externalId: string }> {
    // 1. Fetch original invoice
    const original = await client.getDoc("Sales Invoice", input.invoiceNo);
    if (!original) {
      throw new Error(`Original Sales Invoice ${input.invoiceNo} not found`);
    }

    const origItems: any[] = Array.isArray(original.items) ? original.items : [];
    const itemsDoc = origItems.map((item: any) => ({
      item_code: item.item_code,
      qty: -Math.abs(item.qty), // Negative quantity for return in ERPNext
      rate: item.rate,
      warehouse: item.warehouse,
    }));

    const draft = await client.createDoc("Sales Invoice", {
      company: tenant.erpnextCompany,
      customer: original.customer,
      posting_date: new Date().toISOString().split("T")[0],
      is_return: 1,
      return_against: input.invoiceNo,
      update_stock: 1,
      items: itemsDoc,
      remarks: input.reason || `Return for invoice ${input.invoiceNo}`,
    });

    const draftName = String(draft.name);
    const submitted = await client.submitDoc("Sales Invoice", draftName);

    return { ok: true, externalId: String(submitted.name ?? draftName) };
  }

  /**
   * Cancel a submitted Sales Invoice.
   */
  async cancelInvoice(
    client: ErpNextClient,
    tenant: TenantContext,
    invoiceNo: string,
  ): Promise<{ ok: boolean }> {
    await client.updateDoc("Sales Invoice", invoiceNo, { docstatus: 2 });
    return { ok: true };
  }

  /**
   * List Sales Invoices with filters.
   */
  async listSalesInvoices(
    client: ErpNextClient,
    tenant: TenantContext,
    filters?: { customer?: string; status?: string; limit?: number },
  ) {
    const queryFilters: Array<[string, string, any]> = [
      ["company", "=", tenant.erpnextCompany],
    ];

    if (filters?.customer) {
      queryFilters.push(["customer", "=", filters.customer]);
    }
    if (filters?.status) {
      queryFilters.push(["status", "=", filters.status]);
    }

    const rows = await client.getList("Sales Invoice", {
      fields: [
        "name",
        "customer",
        "posting_date",
        "grand_total",
        "outstanding_amount",
        "status",
        "is_return",
        "return_against",
      ],
      filters: queryFilters,
      limit: filters?.limit || 50,
    });

    return rows.map((r) => ({
      invoiceNo: String(r.name),
      customer: String(r.customer ?? ""),
      postingDate: String(r.posting_date ?? ""),
      grandTotal: Number(r.grand_total ?? 0),
      outstandingAmount: Number(r.outstanding_amount ?? 0),
      status: String(r.status ?? ""),
      isReturn: Boolean(r.is_return),
      returnAgainst: r.return_against ? String(r.return_against) : undefined,
    }));
  }
}
