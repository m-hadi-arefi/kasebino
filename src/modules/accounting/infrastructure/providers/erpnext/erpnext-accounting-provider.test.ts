/**
 * ErpNextAccountingProvider tests — mocked HTTP only (ADR-140).
 */

import { describe, expect, it, vi } from "vitest";
import {
  ErpNextAccountingProvider,
  createErpNextClient,
  loadErpNextProviderConfig,
  mosEventMarker,
  projectItemDoc,
  projectSalesInvoiceDoc,
} from "./index.js";
import type { ErpNextFetch } from "./erpnext-client.js";

const baseConfig = {
  baseUrl: "http://erp.local",
  apiKey: "key",
  apiSecret: "secret",
  company: "MerchantOS Demo",
  warehouse: "Stores - MD",
  costCenter: null,
  priceList: null,
  defaultCustomer: "Cash Customer",
  currency: "IRR",
  timeoutMs: 5000,
  itemGroup: "Products",
  customerGroup: "All Customer Groups",
  territory: "All Territories",
  incomeAccount: null,
  cashAccount: null,
};


describe("ERPNext projectors", () => {
  it("maps piece unit to Nos and marks mos_event", () => {
    const item = projectItemDoc(
      {
        eventId: "e1",
        merchantId: "m1",
        entityType: "product",
        entityId: "p1",
        sku: "SKU-1",
        barcode: "626",
        name: "شیر",
        unitCode: "piece",
        priceAmountMinor: "10000",
      },
      baseConfig,
    );
    expect(item.stock_uom).toBe("Nos");
    expect(item.item_name).toBe("شیر");

    const invoice = projectSalesInvoiceDoc(
      {
        eventId: "e2",
        merchantId: "m1",
        storeId: "s1",
        entityType: "sale",
        entityId: "sale-1",
        saleId: "sale-1",
        idempotencyKey: "idem-1",
        channel: "pos",
        tenderType: "cash",
        totalAmountMinor: "10000",
        currency: "IRR",
        occurredAt: "2026-08-09T10:00:00.000Z",
        lines: [
          {
            productId: "p1",
            quantity: 1,
            unitCode: "piece",
            unitPriceMinor: "10000",
            lineTotalMinor: "10000",
          },
        ],
      },
      baseConfig,
      {
        customerName: "Cash Customer",
        itemCodesByProductId: new Map([["p1", "SKU-1"]]),
      },
    );
    expect(invoice.update_stock).toBe(1);
    expect(String(invoice.remarks)).toContain(mosEventMarker("e2"));
    expect(invoice.is_pos).toBe(1);
  });
});

describe("ErpNextAccountingProvider", () => {
  it("rejects empty sale lines", async () => {
    const client = createErpNextClient(async () => ({ status: 200, json: { data: [] } }));
    const provider = new ErpNextAccountingProvider({ config: baseConfig, client });
    const result = await provider.recordSale({
      eventId: "e",
      merchantId: "m",
      storeId: "s",
      entityType: "sale",
      entityId: "sale",
      saleId: "sale",
      idempotencyKey: "k",
      channel: "pos",
      totalAmountMinor: "0",
      currency: "IRR",
      occurredAt: new Date().toISOString(),
      lines: [],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("sale_lines_required");
  });

  it("creates and submits Sales Invoice idempotently by po_no", async () => {
    const create = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-SINV-001", docstatus: 0 } },
    }));
    const submit = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-SINV-001", docstatus: 1 } },
    }));
    const listEmpty = vi.fn(async () => ({
      status: 200,
      json: { data: [] },
    }));
    const getCashMissing = vi.fn(async () => ({
      status: 404,
      json: {},
    }));
    const createCash = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "Cash Customer" } },
    }));
    const getInvoice = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-SINV-001", docstatus: 0 } },
    }));

    let phase: "first" | "second" = "first";
    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Sales Invoice") && !path.includes("ACC-")) {
        if (phase === "second") {
          return { status: 200, json: { data: [{ name: "ACC-SINV-001" }] } };
        }
        return listEmpty();
      }
      if (req.method === "GET" && path.endsWith("/Customer/Cash Customer")) {
        return getCashMissing();
      }
      if (req.method === "POST" && path.endsWith("/Customer")) {
        return createCash();
      }
      if (req.method === "POST" && path.endsWith("/Sales Invoice")) {
        return create();
      }
      if (req.method === "GET" && path.includes("/Sales Invoice/ACC-SINV-001")) {
        return getInvoice();
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        return submit();
      }
      if (req.method === "GET" && path.includes("/Sales Invoice")) {
        return listEmpty();
      }
      return { status: 404, json: { path: req.path } };
    };

    const provider = new ErpNextAccountingProvider({
      config: baseConfig,
      client: createErpNextClient(fetchImpl),
    });

    const saleInput = {
      eventId: "evt-sale-1",
      merchantId: "m1",
      storeId: "s1",
      entityType: "sale" as const,
      entityId: "sale-1",
      saleId: "sale-1",
      idempotencyKey: "idem-sale-1",
      channel: "pos" as const,
      tenderType: "cash",
      totalAmountMinor: "25000",
      currency: "IRR" as const,
      occurredAt: "2026-08-09T12:00:00.000Z",
      lines: [
        {
          productId: "p1",
          quantity: 1,
          unitCode: "piece",
          unitPriceMinor: "25000",
          lineTotalMinor: "25000",
        },
      ],
    };

    const first = await provider.recordSale(saleInput);
    expect(first.ok).toBe(true);
    expect(first.alreadyApplied).toBe(false);
    expect(first.externalId).toBe("ACC-SINV-001");
    expect(create).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledOnce();

    phase = "second";
    const second = await provider.recordSale(saleInput);
    expect(second.alreadyApplied).toBe(true);
    expect(second.externalId).toBe("ACC-SINV-001");
  });

  it("loadErpNextProviderConfig fails closed on missing secrets", () => {
    expect(() =>
      loadErpNextProviderConfig({
        MOS_ERPNEXT_URL: "http://localhost:8080",
      } as NodeJS.ProcessEnv),
    ).toThrow(/MOS_ERPNEXT_API_KEY/);
  });

  it("never exports DocType helpers from application ports path", async () => {
    const ports = await import("../../../application/ports/accounting-provider.js");
    expect("projectItemDoc" in ports).toBe(false);
  });

  it("syncs supplier idempotently", async () => {
    const createSupplier = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "Supplier-001" } },
    }));
    const listSuppliers = vi.fn(async () => ({
      status: 200,
      json: { data: [] },
    }));

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Supplier")) {
        return listSuppliers();
      }
      if (req.method === "POST" && path.endsWith("/Supplier")) {
        return createSupplier();
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: baseConfig,
      client: createErpNextClient(fetchImpl),
    });

    const res = await provider.syncSupplier({
      merchantId: "m1",
      entityType: "supplier",
      entityId: "sup-1",
      eventId: "evt-sup-1",
      name: "شرکت پخش البرز",
      phone: "09120000000",
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("Supplier-001");
    expect(createSupplier).toHaveBeenCalledOnce();
  });

  it("creates and submits Purchase Invoice idempotently", async () => {
    const createPurchase = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-PINV-001", docstatus: 0 } },
    }));
    const submitPurchase = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-PINV-001", docstatus: 1 } },
    }));

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Purchase Invoice")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "GET" && path.includes("/Supplier")) {
        return { status: 200, json: { data: [{ name: "تامین‌کننده تست" }] } };
      }
      if (req.method === "PUT" && path.includes("/Supplier")) {
        return { status: 200, json: { data: { name: "تامین‌کننده تست" } } };
      }
      if (req.method === "POST" && path.endsWith("/Purchase Invoice")) {
        return createPurchase();
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        return submitPurchase();
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: baseConfig,
      client: createErpNextClient(fetchImpl),
    });

    const res = await provider.recordPurchase({
      eventId: "evt-pur-1",
      merchantId: "m1",
      storeId: "s1",
      entityType: "purchase",
      entityId: "pur-1",
      purchaseId: "pur-1",
      supplierName: "تامین‌کننده تست",
      postingDate: "2026-08-16T10:00:00.000Z",
      totalAmountMinor: "5000000",
      currency: "IRR",
      lines: [
        {
          productId: "p1",
          quantity: 10,
          unitCostMinor: "500000",
          lineTotalMinor: "5000000",
        },
      ],
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("ACC-PINV-001");
    expect(createPurchase).toHaveBeenCalledOnce();
    expect(submitPurchase).toHaveBeenCalledOnce();
  });

  it("creates and submits Return Sales Invoice (Credit Note) reversing inventory", async () => {
    const createReturn = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-SINV-RET-001", docstatus: 0 } },
    }));
    const submitReturn = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-SINV-RET-001", docstatus: 1 } },
    }));

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Sales Invoice") && path.includes("po_no")) {
        return { status: 200, json: { data: [{ name: "ACC-SINV-ORIG-001" }] } };
      }
      if (req.method === "GET" && path.includes("/Sales Invoice/ACC-SINV-ORIG-001")) {
        return { status: 200, json: { data: { name: "ACC-SINV-ORIG-001", customer: "مشتری وفادار" } } };
      }
      if (req.method === "GET" && path.includes("/Sales Invoice")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "POST" && path.endsWith("/Sales Invoice")) {
        return createReturn();
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        return submitReturn();
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: baseConfig,
      client: createErpNextClient(fetchImpl),
    });

    const res = await provider.recordReturn({
      eventId: "evt-ret-1",
      merchantId: "m1",
      storeId: "s1",
      entityType: "return",
      entityId: "ret-1",
      returnId: "ret-1",
      originalSaleOrOrderId: "sale-orig-1",
      totalAmountMinor: "10000",
      currency: "IRR",
      occurredAt: "2026-08-16T10:00:00.000Z",
      lines: [
        {
          productId: "p1",
          quantity: 1,
          unitPriceMinor: "10000",
          lineTotalMinor: "10000",
        },
      ],
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("ACC-SINV-RET-001");
    expect(createReturn).toHaveBeenCalledOnce();
    expect(submitReturn).toHaveBeenCalledOnce();
  });

  it("creates and submits Expense Journal Entry", async () => {
    const createJournal = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-JV-2026-001", docstatus: 0 } },
    }));
    const submitJournal = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-JV-2026-001", docstatus: 1 } },
    }));

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Journal Entry")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "POST" && path.endsWith("/Journal Entry")) {
        return createJournal();
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        return submitJournal();
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: baseConfig,
      client: createErpNextClient(fetchImpl),
    });

    const res = await provider.recordExpense({
      eventId: "evt-exp-1",
      merchantId: "m1",
      entityType: "expense",
      entityId: "exp-1",
      expenseId: "exp-1",
      amountMinor: "250000",
      currency: "IRR",
      expenseDate: "2026-08-16T10:00:00.000Z",
      description: "قبض برق شعبه",
      paymentMethod: "bank",
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("ACC-JV-2026-001");
    expect(createJournal).toHaveBeenCalledOnce();
    expect(submitJournal).toHaveBeenCalledOnce();
  });

  it("creates and submits Stock Transfer Entry between store warehouses", async () => {
    const createTransfer = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "MAT-STE-2026-001", docstatus: 0 } },
    }));
    const submitTransfer = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "MAT-STE-2026-001", docstatus: 1 } },
    }));

    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Stock Entry")) {
        return { status: 200, json: { data: [] } };
      }
      if (req.method === "POST" && path.endsWith("/Stock Entry")) {
        return createTransfer();
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        return submitTransfer();
      }
      return { status: 404, json: {} };
    };

    const provider = new ErpNextAccountingProvider({
      config: baseConfig,
      client: createErpNextClient(fetchImpl),
    });

    const res = await provider.recordTransfer({
      eventId: "evt-xfer-1",
      merchantId: "m1",
      entityType: "stock_transfer",
      entityId: "xfer-1",
      transferId: "xfer-1",
      fromStoreId: "store-1",
      toStoreId: "store-2",
      occurredAt: "2026-08-16T10:00:00.000Z",
      lines: [
        {
          productId: "p1",
          quantity: 5,
          unitCode: "piece",
        },
      ],
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("MAT-STE-2026-001");
    expect(createTransfer).toHaveBeenCalledOnce();
    expect(submitTransfer).toHaveBeenCalledOnce();
  });
});
