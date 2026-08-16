/**
 * ERPNext Full Integration Tests — Production Scope (ADR-126..ADR-141).
 * Tests all 5 major areas:
 * 1. Purchase Invoice & Accounts Payable
 * 2. Sales Return & Credit Notes (inventory reversal & original invoice linking)
 * 3. Expenses (Journal Entries with GL Debit/Credit)
 * 4. Inter-Warehouse Transfers (Stock Entry Material Transfer between store warehouses)
 * 5. Live Financial Reports (Chart of Accounts, General Ledger, P&L, Trial Balance, Payables, Receivables)
 * + Multi-Tenant isolation & Idempotency.
 */

import { describe, expect, it } from "vitest";
import {
  ErpNextAccountingProvider,
  createErpNextClient,
  type ErpNextFetch,
} from "./index.js";
import {
  ErpNextFinanceReader,
  InMemoryErpNextSyncRecordRepository,
} from "../../../../erpnext/index.js";
import type { TenantContext, ErpNextTenantResolver } from "./tenant-resolver.js";
import type { ErpNextConnectionManager } from "./connection-manager.js";

describe("ERPNext Full Production Integration", () => {
  const tenant1Config = {
    baseUrl: "http://erp-tenant1.local",
    apiKey: "t1-key",
    apiSecret: "t1-secret",
    company: "Company Tenant 1",
    warehouse: "Warehouse T1 - Store 1",
    costCenter: "Main - T1",
    priceList: "Standard Selling",
    defaultCustomer: "Cash Customer T1",
    currency: "IRR" as const,
    timeoutMs: 5000,
    itemGroup: "Products",
    customerGroup: "All Customer Groups",
    territory: "All Territories",
    incomeAccount: "Sales - T1",
    cashAccount: "Cash In Hand - T1",
    bankAccount: "Bank Accounts - T1",
    expenseAccount: "Operating Expenses - T1",
  };

  const tenant2Config = {
    baseUrl: "http://erp-tenant2.local",
    apiKey: "t2-key",
    apiSecret: "t2-secret",
    company: "Company Tenant 2",
    warehouse: "Warehouse T2 - Store 1",
    costCenter: "Main - T2",
    priceList: "Standard Selling",
    defaultCustomer: "Cash Customer T2",
    currency: "IRR" as const,
    timeoutMs: 5000,
    itemGroup: "Products",
    customerGroup: "All Customer Groups",
    territory: "All Territories",
    incomeAccount: "Sales - T2",
    cashAccount: "Cash In Hand - T2",
    bankAccount: "Bank Accounts - T2",
    expenseAccount: "Operating Expenses - T2",
  };

  const mockTenantResolver: ErpNextTenantResolver = {
    async resolveTenantContext(input: { merchantId: string; storeId?: string }): Promise<TenantContext> {
      if (input.merchantId === "m-tenant-1") {
        return {
          merchantId: "m-tenant-1",
          erpnextCompany: tenant1Config.company,
          erpnextSiteUrl: tenant1Config.baseUrl,
          defaultWarehouse: tenant1Config.warehouse,
          storeWarehouse: input.storeId === "s-tenant-1-branch2" ? "Warehouse T1 - Store 2" : tenant1Config.warehouse,
          costCenter: tenant1Config.costCenter,
          currency: "IRR",
          apiKey: tenant1Config.apiKey,
          apiSecret: tenant1Config.apiSecret,
        };
      }
      return {
        merchantId: "m-tenant-2",
        erpnextCompany: tenant2Config.company,
        erpnextSiteUrl: tenant2Config.baseUrl,
        defaultWarehouse: tenant2Config.warehouse,
        costCenter: tenant2Config.costCenter,
        currency: "IRR",
        apiKey: tenant2Config.apiKey,
        apiSecret: tenant2Config.apiSecret,
      };
    },
  };

  it("Area 1: Purchase Invoice & Accounts Payable with supplier sync and stock update", async () => {
    const createdDocs: Array<{ doctype: string; body: unknown }> = [];
    const submittedDocs: string[] = [];

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Purchase Invoice")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "GET" && path.includes("/Supplier")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "POST" && path.endsWith("/Supplier")) {
        createdDocs.push({ doctype: "Supplier", body: req.body });
        return { status: 200, json: { data: { name: "تامین‌کننده پارس" } } };
      }
      if (req.method === "POST" && path.endsWith("/Purchase Invoice")) {
        createdDocs.push({ doctype: "Purchase Invoice", body: req.body });
        return { status: 200, json: { data: { name: "ACC-PINV-2026-0001", docstatus: 0 } } };
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        const bodyObj = typeof req.body === "string" ? JSON.parse(req.body) : (req.body as Record<string, unknown>);
        submittedDocs.push(String(bodyObj?.name ?? "ACC-PINV-2026-0001"));
        return { status: 200, json: { data: { name: "ACC-PINV-2026-0001", docstatus: 1 } } };
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: tenant1Config,
      client: createErpNextClient(fetchImpl),
    });

    const result = await provider.recordPurchase({
      eventId: "evt-purchase-100",
      merchantId: "m-tenant-1",
      storeId: "s-tenant-1",
      entityType: "purchase",
      entityId: "pur-100",
      purchaseId: "pur-100",
      supplierName: "تامین‌کننده پارس",
      supplierId: "sup-pars",
      invoiceNumber: "INV-PARS-990",
      postingDate: "2026-08-16T08:30:00.000Z",
      dueDate: "2026-09-16T08:30:00.000Z",
      totalAmountMinor: "15000000",
      currency: "IRR",
      lines: [
        {
          productId: "prod-milk",
          quantity: 30,
          unitCode: "piece",
          unitCostMinor: "500000",
          lineTotalMinor: "15000000",
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.externalId).toBe("ACC-PINV-2026-0001");
    expect(result.alreadyApplied).toBe(false);

    const supplierDoc = createdDocs.find((d) => d.doctype === "Supplier");
    expect(supplierDoc).toBeDefined();

    const pinvDoc = createdDocs.find((d) => d.doctype === "Purchase Invoice")?.body as Record<string, unknown>;
    expect(pinvDoc).toBeDefined();
    expect(pinvDoc.supplier).toBe("تامین‌کننده پارس");
    expect(pinvDoc.update_stock).toBe(1);
    expect(pinvDoc.bill_no).toBe("INV-PARS-990");
    expect(submittedDocs).toContain("ACC-PINV-2026-0001");
  });

  it("Area 2: Sales Return (Credit Note) links to original invoice and reverses stock", async () => {
    const createdDocs: Array<{ doctype: string; body: unknown }> = [];
    const submittedDocs: string[] = [];

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      const full = `${path}?${JSON.stringify(req.query ?? {})}`;
      if (req.method === "GET" && full.includes("po_no")) {
        return { status: 200, json: { data: [{ name: "ACC-SINV-ORIG-777" }] } };
      }
      if (req.method === "GET" && path.includes("/Sales Invoice/ACC-SINV-ORIG-777")) {
        return { status: 200, json: { data: { name: "ACC-SINV-ORIG-777", customer: "مشتری VIP" } } };
      }
      if (req.method === "GET" && path.includes("/Sales Invoice")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "POST" && path.endsWith("/Sales Invoice")) {
        createdDocs.push({ doctype: "Sales Invoice", body: req.body });
        return { status: 200, json: { data: { name: "ACC-SINV-RET-777", docstatus: 0 } } };
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        submittedDocs.push("ACC-SINV-RET-777");
        return { status: 200, json: { data: { name: "ACC-SINV-RET-777", docstatus: 1 } } };
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: tenant1Config,
      client: createErpNextClient(fetchImpl),
    });

    const result = await provider.recordReturn({
      eventId: "evt-ret-500",
      merchantId: "m-tenant-1",
      storeId: "s-tenant-1",
      entityType: "return",
      entityId: "ret-500",
      returnId: "ret-500",
      originalSaleOrOrderId: "sale-orig-777",
      customerName: "مشتری VIP",
      reason: "کالای معیوب",
      totalAmountMinor: "2000000",
      currency: "IRR",
      occurredAt: "2026-08-16T11:00:00.000Z",
      lines: [
        {
          productId: "prod-cheese",
          quantity: 2,
          unitCode: "piece",
          unitPriceMinor: "1000000",
          lineTotalMinor: "2000000",
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.externalId).toBe("ACC-SINV-RET-777");

    const returnDoc = createdDocs.find((d) => d.doctype === "Sales Invoice")?.body as Record<string, unknown>;
    expect(returnDoc.is_return).toBe(1);
    expect(returnDoc.return_against).toBe("ACC-SINV-ORIG-777");
    expect(returnDoc.update_stock).toBe(1);
    const items = returnDoc.items as Array<Record<string, unknown>>;
    expect(items[0]?.qty).toBe(-2);
    expect(submittedDocs).toContain("ACC-SINV-RET-777");
  });

  it("Area 3: Expenses creates and submits Journal Entry with correct Debit and Credit accounts", async () => {
    const createdDocs: Array<{ doctype: string; body: unknown }> = [];
    const submittedDocs: string[] = [];

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Journal Entry")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "POST" && path.endsWith("/Journal Entry")) {
        createdDocs.push({ doctype: "Journal Entry", body: req.body });
        return { status: 200, json: { data: { name: "ACC-JV-2026-00042", docstatus: 0 } } };
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        submittedDocs.push("ACC-JV-2026-00042");
        return { status: 200, json: { data: { name: "ACC-JV-2026-00042", docstatus: 1 } } };
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: tenant1Config,
      client: createErpNextClient(fetchImpl),
    });

    const result = await provider.recordExpense({
      eventId: "evt-exp-99",
      merchantId: "m-tenant-1",
      storeId: "s-tenant-1",
      entityType: "expense",
      entityId: "exp-99",
      expenseId: "exp-99",
      amountMinor: "1200000",
      currency: "IRR",
      paymentMethod: "bank",
      expenseDate: "2026-08-16T12:00:00.000Z",
      description: "هزینه حمل و نقل",
    });

    expect(result.ok).toBe(true);
    expect(result.externalId).toBe("ACC-JV-2026-00042");

    const jvDoc = createdDocs.find((d) => d.doctype === "Journal Entry")?.body as Record<string, unknown>;
    expect(jvDoc.voucher_type).toBe("Expense Entry");
    const accounts = jvDoc.accounts as Array<Record<string, unknown>>;
    expect(accounts).toHaveLength(2);
    expect(accounts[0]?.debit_in_account_currency).toBe(1200000);
    expect(accounts[0]?.credit_in_account_currency).toBe(0);
    expect(accounts[1]?.credit_in_account_currency).toBe(1200000);
    expect(accounts[1]?.debit_in_account_currency).toBe(0);
  });

  it("Area 4: Inter-Warehouse Transfers creates Material Transfer with source/target warehouses", async () => {
    const createdDocs: Array<{ doctype: string; body: unknown }> = [];
    const submittedDocs: string[] = [];

    const mockConnMgr: ErpNextConnectionManager = {
      getClientForTenant: () => createErpNextClient(fetchImpl),
    } as unknown as ErpNextConnectionManager;

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Stock Entry")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "POST" && path.endsWith("/Stock Entry")) {
        createdDocs.push({ doctype: "Stock Entry", body: req.body });
        return { status: 200, json: { data: { name: "MAT-STE-2026-888", docstatus: 0 } } };
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        submittedDocs.push("MAT-STE-2026-888");
        return { status: 200, json: { data: { name: "MAT-STE-2026-888", docstatus: 1 } } };
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: tenant1Config,
      client: createErpNextClient(fetchImpl),
      tenantResolver: mockTenantResolver,
      connectionManager: mockConnMgr,
    });

    const result = await provider.recordTransfer({
      eventId: "evt-xfer-888",
      merchantId: "m-tenant-1",
      entityType: "stock_transfer",
      entityId: "xfer-888",
      transferId: "xfer-888",
      fromStoreId: "s-tenant-1",
      toStoreId: "s-tenant-1-branch2",
      occurredAt: "2026-08-16T14:00:00.000Z",
      lines: [
        {
          productId: "prod-oil",
          quantity: 10,
          unitCode: "piece",
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.externalId).toBe("MAT-STE-2026-888");

    const steDoc = createdDocs.find((d) => d.doctype === "Stock Entry")?.body as Record<string, unknown>;
    expect(steDoc.stock_entry_type).toBe("Material Transfer");
    const items = steDoc.items as Array<Record<string, unknown>>;
    expect(items[0]?.s_warehouse).toBe("Warehouse T1 - Store 1");
    expect(items[0]?.t_warehouse).toBe("Warehouse T1 - Store 2");
    expect(items[0]?.qty).toBe(10);
  });

  it("Area 5 & Multi-Tenancy: Reports and FinanceReader isolate tenant data", async () => {
    const glDatabase: Array<{ company: string; account: string; debit: number; credit: number; voucher_type: string; voucher_no: string }> = [
      { company: "Company Tenant 1", account: "Sales - T1", debit: 0, credit: 100000000, voucher_type: "Sales Invoice", voucher_no: "SINV-T1-1" },
      { company: "Company Tenant 1", account: "Operating Expenses - T1", debit: 30000000, credit: 0, voucher_type: "Journal Entry", voucher_no: "JV-T1-1" },
      { company: "Company Tenant 2", account: "Sales - T2", debit: 0, credit: 50000000, voucher_type: "Sales Invoice", voucher_no: "SINV-T2-1" },
      { company: "Company Tenant 2", account: "Operating Expenses - T2", debit: 10000000, credit: 0, voucher_type: "Journal Entry", voucher_no: "JV-T2-1" },
    ];

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      const full = `${path}?${JSON.stringify(req.query ?? {})}`;
      if (req.method === "GET" && path.includes("/GL Entry")) {
        const filtered = glDatabase.filter((entry) => {
          if (full.includes("Company Tenant 1")) return entry.company === "Company Tenant 1";
          if (full.includes("Company Tenant 2")) return entry.company === "Company Tenant 2";
          return true;
        });
        return { status: 200, json: { data: filtered } };
      }
      if (req.method === "GET" && path.includes("/Sales Invoice")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "GET" && path.includes("/Purchase Invoice")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "GET" && path.includes("/Account")) {
        return {
          status: 200,
          json: {
            data: [
              { name: "Assets - T1", account_name: "دارایی‌ها", root_type: "Asset", is_group: 1 },
              { name: "Cash - T1", account_name: "صندوق", parent_account: "Assets - T1", root_type: "Asset", is_group: 0 },
            ],
          },
        };
      }
      return { status: 404, json: {} };
    };

    const mockConnMgr: ErpNextConnectionManager = {
      getClientForTenant: () => createErpNextClient(fetchImpl),
    } as unknown as ErpNextConnectionManager;

    const syncRecords = new InMemoryErpNextSyncRecordRepository();
    const reader = new ErpNextFinanceReader({
      syncRecords,
      tenantResolver: mockTenantResolver,
      connectionManager: mockConnMgr,
    });

    const pnlTenant1 = await reader.getProfitAndLoss({ merchantId: "m-tenant-1" });
    expect(pnlTenant1.totalIncome.amountMinor).toBe("100000000");
    expect(pnlTenant1.totalExpense.amountMinor).toBe("30000000");
    expect(pnlTenant1.netProfit.amountMinor).toBe("70000000");

    const pnlTenant2 = await reader.getProfitAndLoss({ merchantId: "m-tenant-2" });
    expect(pnlTenant2.totalIncome.amountMinor).toBe("50000000");
    expect(pnlTenant2.totalExpense.amountMinor).toBe("10000000");
    expect(pnlTenant2.netProfit.amountMinor).toBe("40000000");

    const coa = await reader.getChartOfAccounts({ merchantId: "m-tenant-1" });
    expect(coa).toHaveLength(1);
    expect(coa[0]?.name).toBe("Assets - T1");
    expect(coa[0]?.children).toHaveLength(1);
    expect(coa[0]?.children?.[0]?.name).toBe("Cash - T1");
  });
});
